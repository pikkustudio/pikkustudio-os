// Written once by `pikku app native init` — this file is yours to edit, and
// pikku will not touch it again. The plugins in `frontends.<name>.native` are
// initialised in pikku.rs, which pikku rewrites; keep the `pikku::plugins` call.
//
// The webview points at the sidecar's own HTTP origin rather than at
// `tauri://localhost`, so cookies are first-party, there is no CORS, and OAuth
// redirects land where the server expects. The sidecar is the application; this
// shell only supervises it.

// A sidecar shell is a desktop program by construction, and saying so here is
// the difference between an answer and a linker error: `bun build --compile`
// emits no iOS or Android binary to ship, and iOS does not permit spawning a
// bundled executable even if it did.
#[cfg(mobile)]
compile_error!(
    "This app runs a bundled pikku server as a sidecar, which iOS and Android do not permit. Drop native.bundleServer from the frontend's config to bundle only the UI, or set native.url to open a deployed server."
);

mod pikku;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Printed by the sidecar once it is listening *and* its startup lifecycle has
/// finished. The runtime's own "listening on ..." line comes earlier and is not
/// readiness.
const READY_PREFIX: &str = "pikku: ready on http://";

/// Title of the window the ready line opens — the app's own name, once you set it.
const WINDOW_TITLE: &str = "Studio";

/// How long to wait for the ready line before giving up. A sidecar that starts
/// and then hangs prints nothing, so no window is ever built — and a Tauri
/// process with no window cannot be quit from the dock or the taskbar.
const READY_TIMEOUT: Duration = Duration::from_secs(30);

/// Held so the child is not dropped while the app runs, and so a clean exit can
/// stop it explicitly.
struct Sidecar(Mutex<Option<CommandChild>>);

fn parse_ready_port(line: &str) -> Option<u16> {
    let rest = line.split(READY_PREFIX).nth(1)?;
    let authority = rest.split_whitespace().next()?;
    authority
        .trim_end_matches('/')
        .rsplit(':')
        .next()?
        .parse()
        .ok()
}

pub fn run() {
    // A second launch must never spawn a second sidecar: that would be two
    // SQLite writers on one file. Focus what is already running instead.
    let builder = tauri::Builder::default();
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    pikku::plugins(builder)
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            // The schema is applied before the server starts: the runtime does
            // not create it, and a fresh install has an empty database.
            let migrated = tauri::async_runtime::block_on(
                app.shell()
                    .sidecar("pikku-server")?
                    .args(["db", "migrate"])
                    .env(
                        "PIKKU_MIGRATIONS_DIR",
                        app.path()
                            .resolve("migrations", tauri::path::BaseDirectory::Resource)?
                            .to_string_lossy()
                            .to_string(),
                    )
                    .env("PIKKU_DATA_DIR", data_dir.to_string_lossy().to_string())
                    .output(),
            )?;
            if !migrated.status.success() {
                return Err(format!(
                    "database migration failed: {}",
                    String::from_utf8_lossy(&migrated.stderr)
                )
                .into());
            }

            let (mut rx, child) = app
                .shell()
                .sidecar("pikku-server")?
                // Port 0 asks the OS for a free port. Choosing one here and
                // passing it down would race whatever binds it in between, so
                // the sidecar binds first and reports back on its ready line.
                .env("PORT", "0")
                .env("HOST", "127.0.0.1")
                // The database, uploaded content and runtime state live here
                // and nowhere else. A double-clicked app has no meaningful
                // working directory, so the platform's app-data path is the
                // only sane answer — the server reads this in bootstrap.
                .env("PIKKU_DATA_DIR", data_dir.to_string_lossy().to_string())
                // Tauri stops the sidecar on a clean exit, but a hard crash of
                // this process never runs that path, and an orphan would hold
                // the database open with its data key still resident.
                .env("PIKKU_PARENT_PID", std::process::id().to_string())
                .spawn()?;

            app.manage(Sidecar(Mutex::new(Some(child))));

            let opened = Arc::new(AtomicBool::new(false));

            let timeout_handle = app.handle().clone();
            let timeout_opened = opened.clone();
            std::thread::spawn(move || {
                std::thread::sleep(READY_TIMEOUT);
                if !timeout_opened.load(Ordering::SeqCst) {
                    eprintln!(
                        "the pikku sidecar did not become ready within {:?} — giving up",
                        READY_TIMEOUT
                    );
                    timeout_handle.exit(1);
                }
            });

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    let line = match event {
                        CommandEvent::Stdout(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
                        CommandEvent::Stderr(bytes) => {
                            eprint!("{}", String::from_utf8_lossy(&bytes));
                            continue;
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("pikku sidecar exited: {:?}", payload.code);
                            if !opened.load(Ordering::SeqCst) {
                                handle.exit(1);
                            }
                            break;
                        }
                        _ => continue,
                    };
                    print!("{}", line);

                    if opened.load(Ordering::SeqCst) {
                        continue;
                    }
                    if let Some(port) = parse_ready_port(&line) {
                        let url = format!("http://127.0.0.1:{}", port);
                        match url.parse() {
                            Ok(parsed) => {
                                let built = WebviewWindowBuilder::new(
                                    &handle,
                                    "main",
                                    WebviewUrl::External(parsed),
                                )
                                .title(WINDOW_TITLE)
                                .inner_size(1200.0, 800.0)
                                .build();
                                match built {
                                    Ok(_) => opened.store(true, Ordering::SeqCst),
                                    Err(err) => {
                                        eprintln!("could not open the window: {}", err);
                                        handle.exit(1);
                                    }
                                }
                            }
                            Err(err) => {
                                eprintln!("the sidecar reported an unusable url: {}", err);
                                handle.exit(1);
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(sidecar) = window.app_handle().try_state::<Sidecar>() {
                    if let Ok(mut guard) = sidecar.0.lock() {
                        if let Some(child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}
