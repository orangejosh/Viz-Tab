
var undoObj = {'index': 0, 'undoList': []};

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
					chrome.tabs.update(tab.id, {
						url: chrome.extension.getURL("newTab.html")
					});
				}
			});
		}
	});

	// Initialize listener that recieve messages from popup.js or menu.js to save one or all pages.
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		chrome.storage.local.get('groups', function (data) {
			if (request.undo !== undefined){
				undo();
			} else if (request.redo !== undefined){
				redo();
			} else if (request.save !== undefined){
				takeSnapShot(data);
			} else if (request.onePage !== undefined){
				var group = getExistingGroup(request.onePage, data);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.onePage, data);
				}
				
				setActiveGroup(group, data);
				storeOnePage(group, data, isNew);
			} else if (request.allPages !== undefined){
				var group = getExistingGroup(request.allPages, data);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.allPages, data);
				}

				setActiveGroup(group, data);
				chrome.tabs.query({currentWindow: true}, function(tabData){
					storeAllPages(0, group, tabData, data, isNew);
				});
			}
			sendResponse({complete: 'true'});
		});
	});
}

// For some reason this doesn't work at the very beginning of a session
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

function storeOnePage(activeGroup, data, newGroup) {
	chrome.tabs.query({active:true, currentWindow: true}, function(tabs){
		if (tabs[0].url.substring(0,9) == 'chrome://' || tabs[0].url.substring(0,19) == 'chrome-extension://'){
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

		capturePage(activeGroup, page, data, newGroup);
	});
}

function storeAllPages(index, activeGroup, tabData, data, newGroup){
	if (index === tabData.length){
		takeSnapShot(data);
		sendRedraw();
		return;
	} else {
		chrome.tabs.update(tabData[index].id, {active: true}, function() {
			page = getPage(activeGroup, tabData[index].url);

			if (page !== null || 
				tabData[index].url.substring(0,9) === 'chrome://' || 
				tabData[index].url.substring(0,19) === 'chrome-extension://') 
			{ 
				storeAllPages(index + 1, activeGroup, tabData, data, newGroup);
			} else {
				chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
					if (chrome.extension.lastError){
						storeAllPages(index++, activeGroup, tabData, data, newGroup);
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
							storeAllPages(index + 1, activeGroup, tabData, data, newGroup);
						});
					}

				});
			}
		});
	}
}

function getPage(activeGroup, url){
	for (var i = 0; i < activeGroup.pageList.length; i++){
		if (activeGroup.pageList[i].url === url){
			return activeGroup.pageList[i];
		}
	}
	return null;
}

function capturePage(activeGroup, page, data, newGroup){
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
* Redraws the tabs page with new content
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
* Stores a snapshot of the current values for undo and redo
*/
function takeSnapShot(data){
	if (undoObj.index < undoObj.undoList.length - 1){
		undoObj.undoList.splice(undoObj.index + 1);
	}
	undoObj.index++;
	undoObj.undoList.push(data);
}

main();
