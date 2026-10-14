import { describe, expect, test } from 'bun:test'
import { ideaWithAnswers, lastAskedQuestion } from './project-flow.js'

describe('ideaWithAnswers', () => {
  test('keeps the idea alone when nothing was answered', () => {
    expect(ideaWithAnswers('a booking app', [{ question: 'Who is it for?', answer: '', skipped: true }])).toBe('a booking app')
  })

  test('adds each answered question and leaves out the skipped ones', () => {
    const text = ideaWithAnswers('a booking app', [
      { question: 'Who is it for?', answer: 'Yoga students', skipped: false },
      { question: 'What is the hardest part?', answer: '', skipped: true },
    ])
    expect(text).toMatch(/1\. Who is it for\?\nYoga students/)
    expect(text).not.toMatch(/hardest/)
  })
})

describe('lastAskedQuestion', () => {
  const card = 'Short.\n[[ask:{"question":"Who is it for?","tone":"info","options":["Staff"]}]]'
  test('finds the open card', () => {
    expect(lastAskedQuestion([{ kind: 'assistant', text: card }])).toBe('Who is it for?')
  })

  test('is null once the person has replied', () => {
    expect(lastAskedQuestion([{ kind: 'assistant', text: card }, { kind: 'user', text: 'Staff' }])).toBe(null)
  })

  test('is null for an ordinary reply', () => {
    expect(lastAskedQuestion([{ kind: 'assistant', text: 'You are on step 2.' }])).toBe(null)
  })
})
