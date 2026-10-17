import { defineHTTPRoutes, wireHTTPRoutes } from '#pikku/http'
import { ref } from '#pikku/function'
import { translateTexts } from './functions/studio/translate.function.js'
import { sleepReadiness, sleepSettings, setSleepSettings } from './functions/studio/sleep.function.js'
import { startChanges, startBuild } from './functions/studio/headless.function.js'
import { restartDev } from './functions/studio/restart-dev.function.js'
import { startProjectRun, projectRun } from './functions/studio/project-run.function.js'
import { projectChecklist, projectGuideSay, projectGuideAct, projectNoteRun } from './functions/studio/project-flow.function.js'
import { health, trafficCheck } from './functions/studio/health.function.js'
import { studioAccess } from './middleware/access.middleware.js'
import { serviceGate } from './middleware/service.middleware.js'
import { makeFavicons } from './functions/studio/favicons.function.js'
import { deleteVaultSecret, putVaultSecret, vaultActivity, vaultSecrets } from './functions/studio/vault.function.js'
import { getRegistryEntry, installAddon, searchRegistry } from './functions/studio/registry.function.js'

const studioRoutes = defineHTTPRoutes({
  auth: true,
  tags: ['studio'],
  middleware: [studioAccess, serviceGate],
  routes: {
    account: { method: 'post', route: '/studio/account', func: ref('studio:account'), auth: false },
    aiOptions: { method: 'post', route: '/studio/aiOptions', func: ref('studio:aiOptions'), auth: false },
    setAi: { method: 'post', route: '/studio/setAi', func: ref('studio:setAi') },
    changeAi: { method: 'post', route: '/studio/changeAi', func: ref('studio:changeAi') },
    useLocally: { method: 'post', route: '/studio/useLocally', func: ref('studio:useLocally'), auth: false },
    setProfile: { method: 'post', route: '/studio/setProfile', func: ref('studio:setProfile'), auth: false },
    startSignIn: { method: 'post', route: '/studio/startSignIn', func: ref('studio:startSignIn'), auth: false },
    pollSignIn: { method: 'post', route: '/studio/pollSignIn', func: ref('studio:pollSignIn'), auth: false },
    signOut: { method: 'post', route: '/studio/signOut', func: ref('studio:signOut'), auth: false },
    resetStudio: { method: 'post', route: '/studio/resetStudio', func: ref('studio:resetStudio'), auth: false },
    listProjects: { method: 'post', route: '/studio/listProjects', func: ref('studio:listProjects') },
    addProject: { method: 'post', route: '/studio/addProject', func: ref('studio:addProject') },
    createProject: { method: 'post', route: '/studio/createProject', func: ref('studio:createProject') },
    cloneProject: { method: 'post', route: '/studio/cloneProject', func: ref('studio:cloneProject') },
    attachFile: { method: 'post', route: '/studio/attachFile', func: ref('studio:attachFile') },
    removeProject: { method: 'post', route: '/studio/removeProject', func: ref('studio:removeProject') },
    openProject: { method: 'post', route: '/studio/openProject', func: ref('studio:openProject') },
    workspaceLink: { method: 'post', route: '/studio/workspaceLink', func: ref('studio:workspaceLink') },
    workspaceStatus: { method: 'post', route: '/studio/workspaceStatus', func: ref('studio:workspaceStatus') },
    updateDatabase: { method: 'post', route: '/studio/updateDatabase', func: ref('studio:updateDatabase') },
    closeProject: { method: 'post', route: '/studio/closeProject', func: ref('studio:closeProject') },
    closeAllProjects: { method: 'post', route: '/studio/closeAllProjects', func: ref('studio:closeAllProjects') },
    projectApps: { method: 'post', route: '/studio/projectApps', func: ref('studio:projectApps') },
    getDesignPreview: { method: 'post', route: '/studio/getDesignPreview', func: ref('studio:getDesignPreview') },
    restartDesignPreview: { method: 'post', route: '/studio/restartDesignPreview', func: ref('studio:restartDesignPreview') },
    projectLogs: { method: 'post', route: '/studio/projectLogs', func: ref('studio:projectLogs') },
    projectLogEntries: { method: 'post', route: '/studio/projectLogEntries', func: ref('studio:projectLogEntries') },
    projectMetrics: { method: 'post', route: '/studio/projectMetrics', func: ref('studio:projectMetrics') },
    projectDisk: { method: 'post', route: '/studio/projectDisk', func: ref('studio:projectDisk') },
    keepStatus: { method: 'post', route: '/studio/keepStatus', func: ref('studio:keepStatus') },
    keepChanges: { method: 'post', route: '/studio/keepChanges', func: ref('studio:keepChanges') },
    listWorktrees: { method: 'post', route: '/studio/listWorktrees', func: ref('studio:listWorktrees') },
    saveWork: { method: 'post', route: '/studio/saveWork', func: ref('studio:saveWork') },
    listVersions: { method: 'post', route: '/studio/listVersions', func: ref('studio:listVersions') },
    listThemes: { method: 'post', route: '/studio/listThemes', func: ref('studio:listThemes') },
    createWorktree: { method: 'post', route: '/studio/createWorktree', func: ref('studio:createWorktree') },
    createSession: { method: 'post', route: '/studio/createSession', func: ref('studio:createSession') },
    importProject: { method: 'post', route: '/studio/importProject', func: ref('studio:importProject') },
    linkRemote: { method: 'post', route: '/studio/linkRemote', func: ref('studio:linkRemote') },
    pushAll: { method: 'post', route: '/studio/pushAll', func: ref('studio:pushAll') },
    publishLocal: { method: 'post', route: '/studio/publishLocal', func: ref('studio:publishLocal') },
    changes: { method: 'post', route: '/studio/changes', func: ref('studio:changes') },
    projectIntake: { method: 'post', route: '/studio/projectIntake', func: ref('studio:projectIntake') },
    finishIntake: { method: 'post', route: '/studio/finishIntake', func: ref('studio:finishIntake') },
    builderState: { method: 'post', route: '/studio/builderState', func: ref('studio:builderState') },
    mockStatus: { method: 'post', route: '/studio/mockStatus', func: ref('studio:mockStatus') },
    mockPlan: { method: 'post', route: '/studio/mockPlan', func: ref('studio:mockPlan') },
    builderPrompt: { method: 'post', route: '/studio/builderPrompt', func: ref('studio:builderPrompt') },
    chooseDirection: { method: 'post', route: '/studio/chooseDirection', func: ref('studio:chooseDirection') },
    builderCancel: { method: 'post', route: '/studio/builderCancel', func: ref('studio:builderCancel') },
    builderClear: { method: 'post', route: '/studio/builderClear', func: ref('studio:builderClear') },
    builderArchive: { method: 'post', route: '/studio/builderArchive', func: ref('studio:builderArchive') },
    builderChats: { method: 'post', route: '/studio/builderChats', func: ref('studio:builderChats') },
    builderChat: { method: 'post', route: '/studio/builderChat', func: ref('studio:builderChat') },
    publishOptions: { method: 'post', route: '/studio/publishOptions', func: ref('studio:publishOptions') },
    publishStatus: { method: 'post', route: '/studio/publishStatus', func: ref('studio:publishStatus') },
    projectNameTaken: { method: 'head', route: '/studio/projectName', func: ref('studio:projectNameTaken') },
    startProjectRun: { method: 'post', route: '/studio/startProjectRun', func: startProjectRun },
    projectRun: { method: 'post', route: '/studio/projectRun', func: projectRun },
    projectChecklist: { method: 'post', route: '/studio/projectChecklist', func: projectChecklist },
    projectGuideSay: { method: 'post', route: '/studio/projectGuideSay', func: projectGuideSay },
    projectNoteRun: { method: 'post', route: '/studio/projectNoteRun', func: projectNoteRun },
    projectGuideAct: { method: 'post', route: '/studio/projectGuideAct', func: projectGuideAct },
    makeFavicons: { method: 'post', route: '/studio/makeFavicons', func: makeFavicons },
    searchRegistry: { method: 'post', route: '/studio/searchRegistry', func: searchRegistry },
    getRegistryEntry: { method: 'post', route: '/studio/getRegistryEntry', func: getRegistryEntry },
    installAddon: { method: 'post', route: '/studio/installAddon', func: installAddon },
    vaultSecrets: { method: 'post', route: '/studio/vaultSecrets', func: vaultSecrets },
    putVaultSecret: { method: 'post', route: '/studio/putVaultSecret', func: putVaultSecret },
    deleteVaultSecret: { method: 'post', route: '/studio/deleteVaultSecret', func: deleteVaultSecret },
    vaultActivity: { method: 'post', route: '/studio/vaultActivity', func: vaultActivity },
    transcribeAudio: { method: 'post', route: '/studio/transcribeAudio', func: ref('studio:transcribeAudio') },
    builderAttach: { method: 'post', route: '/studio/builderAttach', func: ref('studio:builderAttach') },
    builderModels: { method: 'post', route: '/studio/builderModels', func: ref('studio:builderModels') },
    setBuilderModel: { method: 'post', route: '/studio/setBuilderModel', func: ref('studio:setBuilderModel') },
    translateTexts: { method: 'post', route: '/studio/translateTexts', func: translateTexts },
    startChanges: { method: 'post', route: '/studio/startChanges', func: startChanges },
    restartDev: { method: 'post', route: '/studio/restartDev', func: restartDev },
    startBuild: { method: 'post', route: '/studio/startBuild', func: startBuild },
    sleepSettings: { method: 'post', route: '/studio/sleepSettings', func: sleepSettings },
    setSleepSettings: { method: 'post', route: '/studio/setSleepSettings', func: setSleepSettings },
    shot: { method: 'get', route: '/studio/shot/:key/*path', func: ref('studio:projectShot') },
    proxyGet: { method: 'get', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyPost: { method: 'post', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyPut: { method: 'put', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyPatch: { method: 'patch', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyDelete: { method: 'delete', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyHead: { method: 'head', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
    proxyOptions: { method: 'options', route: '/p/:key{/*rest}', func: ref('studio:projectProxy') },
  },
})

const sleepRoutes = defineHTTPRoutes({
  auth: false,
  tags: ['studio'],
  routes: {
    sleepReadiness: { method: 'post', route: '/studio/sleepReadiness', func: sleepReadiness },
  },
})

const healthRoutes = defineHTTPRoutes({
  auth: false,
  tags: ['studio'],
  routes: {
    health: { method: 'get', route: '/studio/health', func: health },
    traffic: { method: 'get', route: '/studio/traffic', func: trafficCheck },
  },
})

wireHTTPRoutes({ routes: { studio: studioRoutes, sleep: sleepRoutes, health: healthRoutes } })
