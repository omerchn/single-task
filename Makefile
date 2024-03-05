all: package install

package:
	npx @vscode/vsce package --allow-missing-repository --allow-star-activation --skip-license

install:
	code --install-extension single-task-0.0.1.vsix
