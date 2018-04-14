const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu,  ipcMain} = electron;

let mainWindow;
let addWindow;

let knex = require("knex")({
	client: "sqlite3",
	connection: {
		filename: "./shopping.sqlite"
	}
});

// process.env.NODE_ENV = 'production';

// if app is ready
app.on('ready', function() {
	//create new window
	mainWindow = new BrowserWindow({});
	// load html in window
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'mainWindow.html'),
		protocol: 'file:',
		slashes: true
	}));
	ipcMain.on("mainWindowLoaded", function () {
		knex.schema.createTable('Items', function(table) {
		  table.increments('id');
		  table.string('ItemName');
		  table.integer('Purchased').defaultTo(0);
		}).then();

		let result = knex.select("ItemName","Purchased").from("Items")
		result.then(function(rows){
			console.log(rows);
			mainWindow.webContents.send("items", rows);
		}).catch(function(e) {
		  console.error(e);
		});

	});
	
	mainWindow.on('closed', function(){
		app.quit();
	})
	//build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	//insert menu
	Menu.setApplicationMenu(mainMenu);
})


// handle create add window
function createAddWindow(){
	//create new window
	addWindow = new BrowserWindow({
		width: 300,
		height: 200,
		title: 'Add Shopping List'
	});
	// load html in window
	addWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'addWindow.html'),
		protocol: 'file:',
		slashes: true
	}));
	// Garbage handler
	addWindow.on('close', function(){
		addWindow = null;
	})
}


//catch item add
ipcMain.on('item:add', function(e, item){
	let ins = knex('Items').insert({ItemName: item})
	// let ins = knex.insert({ItemName: item}).into('Items');
	ins.then(function(rows){
		console.log(rows);
		mainWindow.webContents.send('item:add', item);
		addWindow.close();
	}).catch(function(err){
		console.error(err);
	});
})

//delete item
ipcMain.on('item:delete', function(e, item){
	let del = knex('Items').where('ItemName', item).del();
	del.then((rows)=>{
		console.log('deleted');
	})
})


// strike item
ipcMain.on('item:strike', function(e, item){
	// 1 means striked
	// 0 means not striked
	let update = knex('Items').where('ItemName', '=', item).update({  Purchased : 1 });
	// let del = knex('Items').where('ItemName', item).del();
	update.then((rows)=>{
		console.log(rows);
	})
})

//remove strike
ipcMain.on('item:nostrike', function(e, item){
	// 1 means striked
	// 0 means not striked
	let update = knex('Items').where('ItemName', '=', item).update({  Purchased : 0 });
	// let del = knex('Items').where('ItemName', item).del();
	update.then((rows)=>{
		console.log(rows);
	})
})

//create menu template
const mainMenuTemplate = [
	{
		label: 'File',
		submenu: [
			{
				label: 'Add Item',
				accelerator: process.platform == 'darwin' ? 'Command+D' : 'Ctrl+D',
				click(){
					createAddWindow();
				}
			},
			{
				label: 'Clear Item',
				click(){
					let del = knex('Items').del();
					del.then((rows)=>{
						console.log('deleted');
					})
					mainWindow.webContents.send('item:clear');
				}
			},
			{
				label: 'Quit',
				accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
				click(){
					app.quit();
				}
			}
		]
	}
]

// if mac push an extra empty object in the beginning
if(process.platform == 'darwin'){
	mainMenuTemplate.unshift({});
}


// show developer tools
if(process.env.NODE_ENV != 'production'){
	mainMenuTemplate.push({
		label: 'Developer Tools',
		submenu: [
			{
				label: 'Toggle DevTools',
				accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
				click(item , focusedWindow){
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: 'reload'
			}
		]
	})
}