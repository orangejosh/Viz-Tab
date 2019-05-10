/**************************************************************************
 * backgroud.js
 *
 * This runs when chrome is opened. Adds listeners to handle messages
 * from content scripts. Handles saving of the tabs data into chromes
 * local storage. The structure of the data is as follows:
 *
 * Object 
 * 		toggle: (save one tab or all tabs)
 *		groupToggle: (collapse multiple rows of groups)
 *		newTab: (override the new tab with Viz-Tab)
 *
 * 		groups (an array of groups)
 * 			active: (is this the active group)
 * 			id: (id of group)
 * 			name: (name of group)
 * 			pageList (an array of pages)
 *				scroll:
 *				title:
 *				url:
 *				img:
 *
/**************************************************************************/


var undoObj = {'index': 0, 'history': []};
var MAX_UNDO = 20;

main();

function main(){
	// Checks for an old version and updates the 
	updateOldVersion();

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
	// save state, save one tab, or save all tabs.
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		chrome.storage.local.get(null, function (data) {
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
			} else if (request.scroll !== undefined){
/*
				// TODO get this to work
				messageData = request.scroll.split(" ");
				tabID = parseInt(messageData[0]);
				pageScroll = messageData[1];
    			chrome.tabs.sendMessage(tabID, {scroll: "500"});
*/
			}
		});
	});
}

function undo(){
	undoObj.index--;
	if (undoObj.index < 0){
		undoObj.index = 0;
	}

	data = undoObj.history[undoObj.index];
	chrome.storage.local.set(data, function() {
		sendRedraw();
	});
}

function redo(){
	undoObj.index++;
	if (undoObj.index >= undoObj.history.length){
		undoObj.index = undoObj.history.length - 1;
	}
	data = undoObj.history[undoObj.index];
	chrome.storage.local.set(data, function() {
		sendRedraw();
	});
}

/*
 * Save the present state of viz-tab for undo/redo
 */
function takeSnapShot(data){
	if (undoObj.index < undoObj.history.length - 1){
		undoObj.history.splice(undoObj.index + 1);
	}
	if (undoObj.history.length > MAX_UNDO){
		undoObj.history.shift();
		undoObj.index--;
	}
	undoObj.index++;
	undoObj.history.push(data);
}

/*
 * Save either one tab or all the tabs into the group 'name'
 */
function saveTabs(name, data, allTabs){
	var activeIndex = getExistingGroup(name, data);
	if (activeIndex === null){
		activeIndex = getNewGroup(name, data);
	} 

	data.activeIndex = activeIndex;
	var group = data.groups[activeIndex];

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
		return null;
	}

	for (var i = 0; i < data.groups.length; i++){
		var aGroup = data.groups[i];
		if (name === aGroup.name){
			return i;
		}
	}
	return null;
}

function getNewGroup(name, data){
	aGroup = {
		'id': (new Date()).getTime().toString(),
		'name': name,
		'pageList': []
	}
	data.groups.push(aGroup);
	return data.groups.length - 1;
}
	

/*
 * Gets the active tab, checks to make sure the active tab is not viz-tab, checks to make sure
 * that the active tab is not already saved, creats a new page, and captures the data from it.
 */
function storeOnePage(activeGroup, data) {
	chrome.tabs.query({active:true, currentWindow: true}, function(tabs){
		if (tabs[0].url.substring(0,9) == 'chrome://' || tabs[0].url.substring(0,19) == 'chrome-extension://'){
			return;
		}
		page = getPage(activeGroup, tabs[0].url);
		if (page !== null) return;

		chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
			var image = new Image();
			image.src = img;
			image.onload = function() {
				page = {
					'url': tabs[0].url,
					'title': tabs[0].title,
					'scroll': 0,
					'img': scaleImage(image)
				}
				activeGroup.pageList.push(page);
				chrome.storage.local.set(data, function() {
					sendRedraw();
					takeSnapShot(data);
				});
			}
/*
    		chrome.tabs.sendMessage(tabs[0].id, {page: 'getScroll'}, function(response) {  
				var scroll = response === undefined ? 0 : response.scroll;
			});
*/
		})
	});
}

/*
 * Loops through all tabs, checks to make sure the each tab is not viz-tab, checks to make sure
 * that each tab is not already saved, creats a new page, and captures the data from it.
 */
function storeAllPages(index, activeGroup, tabData, data){
	if (index === tabData.length){
		chrome.storage.local.set(data, function() {
			takeSnapShot(data);
			sendRedraw();
		});
		return;
	} else {
		chrome.tabs.update(tabData[index].id, {active: true}, function() {
			page = getPage(activeGroup, tabData[index].url);

			if (page !== null || 
				tabData[index].url.substring(0,19) === 'chrome-extension://' ||
				tabData[index].url.substring(0,9) === 'chrome://')
			{ 
				storeAllPages(index + 1, activeGroup, tabData, data);
			} else {
				chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
					if (chrome.extension.lastError){
						storeAllPages(index + 1, activeGroup, tabData, data);
						return;
					}
					var image = new Image();
					image.src = img;

					image.onload = function() {
						image = scaleImage(image);

						var newPage = {
							'url': tabData[index].url,
							'title': tabData[index].title,
							'scroll': scroll,
							'img': image
						}

						activeGroup.pageList.push(newPage);
						storeAllPages(index + 1, activeGroup, tabData, data);
					}
/*
    				chrome.tabs.sendMessage(tabData[index].id, {page: 'getScroll'}, function(response) {  
						var scroll = response === undefined ? 0 : response.scroll;
					});
*/
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

/*
 * Along with moveImage(), updateOldVersion() converts the data
 * structure from the old version to the new.
 */
function updateOldVersion(){
	var lostGroups = [];
	chrome.storage.local.get(null, function(data){
		if (data.groupList === undefined){
			return;
		}

		var newData = {
			groups: undefined,
			newTab: undefined,
			toggle: undefined,
			groupToggle: undefined
		}

		for (key in data){
			if (key === 'groupList'){
				newData.groups = data[key];
			} else if (key === 'newTab'){
				newData.newTab = data[key];
			} else if (key === 'toggle'){
				newData.toggle = data[key];
			} else if (key === 'groupToggle'){
				newData.groupToggle = data[key];
			} else if (key !== 'pages' && key !== 'undoObj') {
				var imgGroup = {};
				imgGroup[key] = data[key];
				lostGroups.push(imgGroup);
			}
		}
		for (key in lostGroups){
			var groupObj = lostGroups[key];
			var groupID = Object.keys(groupObj)[0];
			var group = groupObj[groupID];
			for (page in group){
				var url = group[page].url;
				var img = group[page].img;
				moveImage(newData, groupID, url, img);
			}
		}

		chrome.storage.local.clear(function(){
			chrome.storage.local.set(newData);
		});
	});
}

function moveImage(newData, groupID, url, img){
	for (group in newData.groups){
		if (groupID === newData.groups[group].id){
			for (page in newData.groups[group].pageList){
				if (url === newData.groups[group].pageList[page].url){
					newData.groups[group].pageList[page].img = img;
					return;
				}
			}
		}
	}
}
