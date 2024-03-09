import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import * as vscode from 'vscode'

const tasksFileName = 'tasks.txt'

let statusBarItem: vscode.StatusBarItem
let tasksFilePath: string

export async function activate(context: vscode.ExtensionContext) {
  await ensureTasksFileExists(context.globalStorageUri.fsPath)

  const command = 'single-task.openTasksFile'

  let disposable = vscode.commands.registerCommand(command, () => {
    vscode.workspace.openTextDocument(tasksFilePath).then((doc) => {
      vscode.window.showTextDocument(doc)
    })
  })

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    -999999999999999999999999999999
  )
  statusBarItem.command = command
  // statusBarItem.backgroundColor = new vscode.ThemeColor(
  //   'statusBarItem.warningBackground'
  // )
  statusBarItem.color = new vscode.ThemeColor(
    'ports.iconRunningProcessForeground'
  )

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(context.globalStorageUri.fsPath, tasksFileName)
  )

  watcher.onDidChange(() => {
    updateStatusBarItem()
  })

  updateStatusBarItem()

  context.subscriptions.push(statusBarItem)
  context.subscriptions.push(disposable)
  context.subscriptions.push(watcher)
}

async function ensureTasksFileExists(globalStorageUriPath: string) {
  if (!existsSync(globalStorageUriPath)) {
    await mkdir(globalStorageUriPath)
  }
  tasksFilePath = `${globalStorageUriPath}/${tasksFileName}`
  try {
    await readFile(tasksFilePath)
  } catch {
    await writeFile(
      tasksFilePath,
      'This is the global tasks file.\nPrefix any line with a "- " to mark as the current task.'
    )
  }
}

function getTaskFromTodo(todo: string, lines: Array<string>) {
  const [category, subject, taskNr] = todo.split(':')
  let inCategory = false,
    inSubject = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === `--- ${category}`) {
      inCategory = true
      continue
    }
    if (inCategory) {
      if (line === `-- ${subject}`) {
        inSubject = true
        continue
      }
    }
    if (inSubject) {
      if (line.startsWith('- ')) {
        return line.slice(2)
      }
      if (line.startsWith('-- ') || line.startsWith('--- ')) {
        // we are not the the target subject anymore
        return null
      }
    }
  }
  return null
}

function getCurrentTaskFromFile(file: string) {
  let mode: 'todo' | 'tasks' = 'tasks'

  let lines = file.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line === 'TODO') {
      mode = 'todo'
      continue
    }
    if (line === 'TASKS') {
      mode = 'tasks'
      continue
    }

    if (mode === 'todo') {
      if (line) {
        const maybeTask = getTaskFromTodo(line, lines)
        if (maybeTask) {
          return maybeTask
        } else {
          continue
        }
      }
    }

    if (mode === 'tasks') {
      if (line.startsWith('- ')) {
        return line.slice(2)
      }
    }
  }
  return null
}

async function updateStatusBarItem() {
  if (!statusBarItem || !tasksFilePath) return
  const fileText = await readFile(tasksFilePath, {
    encoding: 'utf-8',
  })
  const task = getCurrentTaskFromFile(fileText)
  if (task) {
    statusBarItem.text = task
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }
}

export function deactivate() {}
