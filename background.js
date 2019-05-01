
main();

function main(){
	// Add groupListeners that recieve messages from popup.js  to save one or all pages.
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		chrome.storage.local.get('groups', function(data){
			if (request.onePage !== undefined){
				group = getExistingGroup(request.onePage, data);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.onePage, data);
				}
				
				setActiveGroup(group, data);
				storeOnePage(group, data, isNew);
			} else if (request.allPages !== undefined){
				group = getExistingGroup(request.allPages, data);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.allPages, data);
				}

				setActiveGroup(group, data);
				chrome.tabs.query({currentWindow: true}, function(tabData){
					storeAllPages(0, group, tabData, data, isNew);
				})
			}
		})
		sendResponse({complete: 'true'});
	})

	chrome.tabs.onCreated.addListener(function(tab) {
		if (tab.url === "chrome://newtab/"){
			chrome.storage.local.get('newTab', function(data){
				var newTabOn = data.newTab !== undefined && data.newTab === true;
				if (newTabOn){
					chrome.tabs.update(tab.id, {
						url: chrome.extension.getURL("newTab.html")
					})
				}
			})
		}
	})
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
		page = getPage(activeGroup, tabs[0].url);

		if (page !== null){
			if (url.substring(0,9) == 'chrome://' || url.substring(0,19) == 'chrome-extension://'){
				return;
			} else if (page.img === '/images/missingImg.jpg'){
				page.img = undefined;
			}
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
		sendRedraw();
		return;
	} else {
		chrome.tabs.update(tabData[index].id, {active: true}, function() {
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

				// Create snapshot for undo/redo
				var lostImg = createLostImage(
					'add',
					activeGroup.id,
					newGroup,
					[{'img': image, 'url': page.url}]
				)
				//takeSnapShot(data,lostImg);
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

function createLostImage(action, id, newGroup, imgData){
	var imgObj = {
		'action': action,
		'id': id,
		'newGroup': newGroup,
		'imgData': imgData
	}
	return imgObj;
}

/*
* Stores a snapshot of the current values for undo and redo
*/
// TODO update this!
function takeSnapShot(data, lostImg){
	chrome.storage.local.get('undoObj', function(data){
		var undoObj = data.undoObj === undefined ? {'index': 0, 'groupList': []} : data.undoObj;

		if (undoObj.index < undoObj.groupList.length - 1){
			undoObj.groupList.splice(undoObj.index + 1);
		}
		var grpList = data.groups;
		var snapShot = [];
		for (var i = 0; i < grpList.length; i++){
			var group = grpList[i];
			var groupCopy = {
				'id': group.id,
				'name': group.name, 
				'active': group.active,
				'pageList': []
			};
			for (var j = 0; j < group.pageList.length; j++){
				var page = group.pageList[j];
				var pageCopy = {
					'title': page.title,
					'url': page.url,
					'scroll': page.scroll
				}
				groupCopy.pageList.push(pageCopy);
			}
			snapShot.push(groupCopy);
		}
		var addObj = {'snapshot': snapShot, 'lostImgs': lostImg};
		undoObj.groupList.push(addObj);
		undoObj.index = undoObj.groupList.length - 1;
		data.undoObj = undoObj;

		chrome.storage.local.set(data);
	})
}



