'use strict';
const electron = require('electron');
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const url = require('url');
const ipc = require('electron').ipcMain;
const utils = require('./utils/ip.js');
const nativeImage = require('electron').nativeImage;
const path = require('path');
const MESSAGE = require('./message');
const app = electron.app;
const dialog = electron.dialog;
const menu = electron.Menu;

// Adds debug features like hotkeys for triggering dev tools and reload
//require('electron-debug')();
// Prevent window being garbage collected
let mainWindow;
let debugWindow;


/* const isDevelopment = (process.env.NODE_ENV || "development") === "development";
if (isDevelopment) {
	require('electron-reload')(__dirname, {
		ignored: /node_modules|[\/\\]\./
	});
} */

function onClosed() {
	// For multiple windows store them in an array
	mainWindow = null;
	debugWindow = null;
}

function execute(command, callback) {
	exec(command, function (error, stdout, stderr) {
		let contents = mainWindow.webContents;
		//console.log("win", error)
		contents.send('message-log', null, error);
		callback(stdout, error, stderr);

	});
};

function createMainWindow() {
	var image = nativeImage.createFromPath('./assets/texture.png');
	const win = new electron.BrowserWindow({
		icon: image,
		backgroundColor: '#2e2c29',
		resizable: false,
		width: 1200,
		height: 800,
		frame: true //无边框窗口
	});

	let indexPath = url.format({
		protocol: 'file:',
		pathname: path.join(__dirname, './view', 'index.html'),
		slashes: true
	});

	win.loadURL(indexPath);
	win.on('closed', onClosed);
	return win;
}

function newDebugWindow(message) {
	//新建
	debugWindow = new electron.BrowserWindow({
		resizable: true,
		width: 1000,
		height: 600,
	});
	var str = `http://${message}:8089/client/#anonymous`;
	debugWindow.loadURL(str);
	debugWindow.on('closed', function () {
		debugWindow = null;
	});
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});


app.on('ready', () => {
	mainWindow = createMainWindow();

	// 在主进程中.
	ipc.on('asynchronous-message', function (event, type, message) {

		switch (type) {
			case MESSAGE.INIT:
				break;
			case MESSAGE.GET_NODE_INFO:
				execute('node -v', function (output) {
					event.sender.send('message-callback', type, output);
				});
				break;
			case MESSAGE.GET_IP_INFO:
				event.sender.send('message-callback', type, utils.getIP());
				break;
			case MESSAGE.GET_WEINRE_INFO:
				execute('npm list -g weinre', function (output, err, stderr) {
					let empty = output.indexOf("empty");	//是否安装
					if (empty > 0) {
						event.sender.send('message-callback', MESSAGE.WEINRE_NO_INSTALL);
					} else {
						event.sender.send('message-callback', type, output);
					}
				});
				break;
			case MESSAGE.WEINRE_DO_INSTALL:
				execute('npm install -g weinre', function (output, err, stderr) {
					event.sender.send('message-callback', MESSAGE.WEINRE_INSTALL_COMPLETE);
				})
				break;
			case MESSAGE.START:
				if (debugWindow) return;
				let ok = true;
				execute(`weinre --boundHost ${message} --httpPort 8089 `, function (output, err, stderr) {
					ok = false;
				});
				if (ok) {
					setTimeout(() => {
						event.sender.send('message-callback', type, "启动");
						newDebugWindow(message);
					}, 5000);
				}
				break;
			case MESSAGE.OPEN_WIN:
				if (debugWindow) return;
				newDebugWindow(message);
				break;
		}
	});


});
