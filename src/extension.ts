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
  statusBarItem.color = new vscode.ThemeColor('button.background')

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

async function updateStatusBarItem() {
  if (!statusBarItem || !tasksFilePath) return
  const tasks = await readFile(tasksFilePath, {
    encoding: 'utf-8',
  })
  try {
    tasks.split('\n').forEach((line) => {
      if (line.startsWith('- ')) {
        const task = line.slice(2)
        statusBarItem.text = task
        throw null
      }
    })
    statusBarItem.text = ''
  } catch {}
  statusBarItem.show()
}

export function deactivate() {}
