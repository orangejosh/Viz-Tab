/**************************************************************************
 * backgroud.js
 *
 * This runs when chrome is opened. Adds listeners to handle messages
 * from content scripts. Handles saving of the tabs data into chromes
 * local storage. The format of the data is as follows:
 *
 * Object 
 * 		groups (an array of groups)
 * 			active: (is this the active group)
 * 			id: (id of group)
 * 			name: (name of group)
 * 			pageList (an array of pages)
 *				scroll:
 *				title:
 *				url:
 *				img:
 * 		toggle (save one tab or all tabs)
 *
/**************************************************************************/


var undoObj = {'index': 0, 'undoList': []};

main();

function main(){
	// Initialize undoObj with current groups
	chrome.storage.local.get('groups', function(data){
		undoObj.undoList.push(data);
	});


	// Listener to override newTab with Viz-Tab, if enabled
	chrome.tabs.onCreated.addListener(function(tab) {
		if (tab.url === "chrome://newtab/"){
			chrome.storage.local.get('newTab', function(data){
				var newTabOn = data.newTab !== undefined && data.newTab === true;
				if (newTabOn){
					chrome.tabs.update(tab.id, {url: chrome.extension.getURL("newTab.html")});
				}
			});
		}
	});

	// Listener that recieves messages to execute undo, redo, 
	// save present state, saves one tab, or saves all tabs.
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		chrome.storage.local.get('groups', function (data) {
			if (request.undo !== undefined){
				undo();
			} else if (request.redo !== undefined){
				redo();
			} else if (request.save !== undefined){
				takeSnapShot(data);
			} else if (request.onePage !== undefined){
				saveTabs(request.onePage, data, false);
			} else if (request.allPages !== undefined){
				saveTabs(request.allPages, data, true);
			}
			sendResponse({complete: 'true'});
		});
	});
}

function undo(){
	undoObj.index--;
	if (undoObj.index < 0){
		undoObj.index = 0;
	}

	data = undoObj.undoList[undoObj.index];
	chrome.storage.local.set({'groups': data.groups}, function() {
		sendRedraw();
	});
}

function redo(){
	undoObj.index++;
	if (undoObj.index >= undoObj.undoList.length){
		undoObj.index = undoObj.undoList.length - 1;
	}
	data = undoObj.undoList[undoObj.index];
	chrome.storage.local.set({'groups': data.groups}, function() {
		sendRedraw();
	});
}

/*
 * Save the present state of viz-tab for undo/redo
 */
function takeSnapShot(data){
	if (undoObj.index < undoObj.undoList.length - 1){
		undoObj.undoList.splice(undoObj.index + 1);
	}
	undoObj.index++;
	undoObj.undoList.push(data);
}

/*
 * Save either one tab or all the tabs into the group 'name'
 */
function saveTabs(name, data, allTabs){
	var group = getExistingGroup(name, data);

	if (group === null){
		group = getNewGroup(name, data);
	}
	
	setActiveGroup(group, data);

	if (allTabs){
		chrome.tabs.query({currentWindow: true}, function(tabData){
			storeAllPages(0, group, tabData, data);
		});
	} else {
		storeOnePage(group, data);
	}
}

/*
 * Returns a group with arg 'name' or null if not present
 */
function getExistingGroup(name, data){
	if (data.groups === undefined){
		data.groups = [];
	}

	for (var i = 0; i < data.groups.length; i++){
		var aGroup = data.groups[i];
		if (name === aGroup.name){
			return aGroup;
		}
	}
	return null;
}

function getNewGroup(name, data){
	aGroup = {
		'id': (new Date()).getTime().toString(),
		'name': name,
		'active': true,
		'pageList': []
	}
	data.groups.push(aGroup);
	return aGroup;
}

function setActiveGroup(group, data){
	for (var i = 0; i < data.groups.length; i++){
		var aGroup = data.groups[i];
		if (aGroup === group){
			aGroup.active = true;
		} else {
			aGroup.active = false;
		}
	}
}

/*
 * Gets the active tab, checks to make sure the active tab is not viz-tab, checks to make sure
 * that the active tab is not already saved, creats a new page, and captures the data from it.
 */
function storeOnePage(activeGroup, data) {
	chrome.tabs.query({active:true, currentWindow: true}, function(tabs){
		if (tabs[0].url.substring(0,19) == 'chrome-extension://'){
			return;
		}

		page = getPage(activeGroup, tabs[0].url);

		if (page !== null){
			return;
		} else {
			page = {
				'url': tabs[0].url,
				'title': tabs[0].title,
				'scroll': 0,
				'img': undefined
			}
			activeGroup.pageList.push(page);
		}

		chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
			var image = new Image();
			image.src = img;

			image.onload = function() {
				page.img = scaleImage(image);
				chrome.storage.local.set({'groups': data.groups}, function() {
					sendRedraw();
					takeSnapShot(data);
				});
			}
		})
	});
}

/*
 * Loops through all tabs, checks to make sure the each tab is not viz-tab, checks to make sure
 * that each tab is not already saved, creats a new page, and captures the data from it.
 */
function storeAllPages(index, activeGroup, tabData, data){
	if (index === tabData.length){
		takeSnapShot(data);
		sendRedraw();
		return;
	} else {
		chrome.tabs.update(tabData[index].id, {active: true}, function() {
			page = getPage(activeGroup, tabData[index].url);

			if (page !== null || tabData[index].url.substring(0,19) === 'chrome-extension://') { 
				storeAllPages(index + 1, activeGroup, tabData, data);
			} else {
				chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
					if (chrome.extension.lastError){
						storeAllPages(index++, activeGroup, tabData, data);
						return;
					}
					var image = new Image();
					image.src = img;

					image.onload = function() {
						image = scaleImage(image);

						var newPage = {
							'url': tabData[index].url,
							'title': tabData[index].title,
							'scroll': 0,
							'img': image
						}

						activeGroup.pageList.push(newPage);

						chrome.storage.local.set({'groups': data.groups}, function() {
							storeAllPages(index + 1, activeGroup, tabData, data);
						});
					}

				});
			}
		});
	}
}

/*
 * Gets the page with the argument 'url' from the activeGroup
 */
function getPage(activeGroup, url){
	for (var i = 0; i < activeGroup.pageList.length; i++){
		if (activeGroup.pageList[i].url === url){
			return activeGroup.pageList[i];
		}
	}
	return null;
}

/*
* Scales the screen shot to the appropriate thumbnail size
*/
function scaleImage(image){
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	var ratio = image.width / image.height;
	
	if (ratio > 1.8){
		canvas.width = 240;
		canvas.height = canvas.width / ratio;
	} else {
		canvas.height = 135;
		canvas.width = canvas.height * ratio;
	}

	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL('image/jpeg', 0.9);
}

/*
* Redraws the viz tab page with new content
*/
function sendRedraw(){
	chrome.windows.getAll({populate:true}, function(windows){
		windows.forEach(function(aWindow){
			aWindow.tabs.forEach(function(tab){
				if (tab.url.includes('newTab.html')){
					chrome.tabs.sendMessage(tab.id, {page: 'redraw'});
				}	
			})
		})
	})
}


