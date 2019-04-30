
main();

function main(){
	// Add groupListeners that recieve messages from popup.js  to save one or all pages.
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		chrome.storage.local.get('groups', function(list){
			if (request.onePage !== undefined){
				group = getExistingGroup(request.onePage, list);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.onePage, list);
				}
				
				setActiveGroup(group, list);
				storeOnePage(group, list, isNew);
			} else if (request.allPages !== undefined){
				group = getExistingGroup(request.allPages, list);
				isNew = group === null;

				if (group === null){
					group = getNewGroup(request.allPages, list);
				}

				setActiveGroup(group, list);
				chrome.tabs.query({currentWindow: true}, function(theTabs){
					storeAllPages(group, 0, theTabs, list, isNew)
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


function getExistingGroup(name, list){
	if (list.groups === undefined){
		list.groups = [];
	}

	for (var i = 0; i < list.groups.length; i++){
		var aGroup = list.groups[i];
		if (name === aGroup.name){
			return aGroup;
		}
	}
	return null;
}

function getNewGroup(name, list){
	aGroup = {
		'id': (new Date()).getTime().toString(),
		'name': name,
		'active': true,
		'pageList': []
	}
	list.groups.push(aGroup);
	return aGroup;
}

function setActiveGroup(group, list){
	for (var i = 0; i < list.groups.length; i++){
		var aGroup = list.groups[i];
		if (aGroup === group){
			aGroup.active = true;
		} else {
			aGroup.active = false;
		}
	}
}
	

/***************STORE ONE PAGE START****************/

function storeOnePage(activeGroup, list, newGroup) {
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
				'groupID': activeGroup.id,
				'url': tabs[0].url,
				'title': tabs[0].title,
				'scroll': 0,
				'img': undefined
			}
			activeGroup.pageList.push(page);
		}

		capturePage(activeGroup, page, list, newGroup);
	})
}

function getPage(activeGroup, url){
	for (var i = 0; i < activeGroup.pageList.length; i++){
		if (activeGroup.pageList[i].url === url){
			return activeGroup.pageList[i];
		}
	}
	return null;
}

function capturePage(activeGroup, page, list, newGroup){
	chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
		var image = new Image();
		image.src = img;

		image.onload = function() {
			page.img = scaleImage(image);
			chrome.storage.local.set({'groups': list.groups}, function() {
				sendRedraw();
				var lostImg = createLostImage(
					'add',
					activeGroup.id,
					newGroup,
					[{'img': image, 'url': page.url}]
				)
				takeSnapShot(list,lostImg);
			});
		}
	})
}

/***************STORE ONE PAGE END****************/




/***************STORE ALL PAGES START****************/

var activeTab;

function storeAllPages(activeGroup, index, tabs, groupList, newGroup){
	if (index === tabs.length){
		chrome.storage.local.get(activeGroup.id, function(imgList){
			if (imgList[activeGroup.id] === undefined){
				imgList[activeGroup.id] = [];
			}
			var lostImg = createLostImage(
				'add',
				activeGroup.id,
				newGroup,
				[]
			)
			storeAllImages(0, activeGroup, tabs, imgList, groupList, lostImg);
		})
		return;
	}

	var tab = tabs[index];
	if (tab.active){
		activeTab = tab;
	}
	if (checkForDuplicates(activeGroup.pageList, tab.url)){
		index++;
		storeAllPages(activeGroup, index, tabs, groupList, newGroup);
		return;
	}
	var data = {
		'url': tab.url,
		'title': tab.title,
		'scroll': 0 
	}
	activeGroup.pageList.push(data);
	storeAllPages(activeGroup, index++, tabs, groupList, newGroup);
/*
	chrome.tabs.sendMessage(tab.id, {page: 'getScroll'}, function(response){
		var scroll = response === undefined ? 0 : response.scroll;
		var data = {
			'url': tab.url,
			'title': tab.title,
			'scroll': scroll
		}
		activeGroup.pageList.push(data);
		storeAllPages(activeGroup, index++, tabs, groupList, newGroup);
	})
*/
}

function storeAllImages(index, activeGroup, tabList, imgList, groupList, lostImg){
	if (index >= tabList.length){
		if (activeTab !== undefined){
			chrome.tabs.update(activeTab.id, {active: true});
		}
		chrome.storage.local.set(imgList, function(){
			chrome.storage.local.set(groupList, function(){
				sendRedraw();
				takeSnapShot(groupList, lostImg);
			})
		})
		return;
	}

	var tab = tabList[index];
	chrome.tabs.update(tab.id, {active:true}, function(){
		if (tab.url.substring(0,9) === 'chrome://'){
			storeAllImages(index+1, activeGroup, tabList, imgList, groupList, lostImg);
			return;
		}

		var storedList = imgList[activeGroup.id];
		for (var i = 0; i < storedList.length; i++){
			var imgObj = storedList[i];
			if (imgObj.url === tab.url){
				if (imgObj.img === '/images/missingImg.jpg'){
					storedList.splice(i, 1);
					captureAllTabs(index, activeGroup, tabList, imgList, groupList, lostImg)
					return;
				} else {
					storeAllImages(index+1, activeGroup, tabList, imgList, groupList, lostImg);
					return;
				}
			}
		}
		captureAllTabs(index, activeGroup, tabList, imgList, groupList, lostImg);
	});
}

function captureAllTabs (index, activeGroup, tabList, imgList, groupList, lostImg){
	var tab = tabList[index];
	chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
		if (chrome.extension.lastError){
			var imgObj = {'url': tab.url, 'img': '/images/missingImg.jpg'};
			imgList[activeGroup.id].push(imgObj);
			lostImg.imgData.push(imgObj);
			storeAllImages(index+1, activeGroup, tabList, imgList, groupList, lostImg);
			return;
		}
		var image = new Image();
		image.src = img;

		image.onload = function() {
			var newImg = scaleImage(image);
			var imgObj = {'url': tab.url, 'img': newImg};
			imgList[activeGroup.id].push(imgObj);
			lostImg.imgData.push(imgObj);
			storeAllImages(index+1, activeGroup, tabList, imgList, groupList, lostImg);
		}
	});	
}
/***************STORE ALL PAGES END****************/


function checkForDuplicates(pageList, url){
	if (url.substring(0,9) == 'chrome://' || url.substring(0,19) == 'chrome-extension://'){
		return true;
	}

	for(var i = 0; i < pageList.length; i++){
		var page = pageList[i];
		var aUrl = page['url'];
		if (aUrl === url){
			return true;
		}
	}
	return false;
}

function checkMissingImg(activeGroup, url){
	for (var i = 0; i < activeGroup.pageList.length; i++){
		var page = activeGroup.pageList[i];
		if (page.url === url && page.img === '/images/missingImg.jpg'){
			activeGroup.pageList[i].img = undefined;
			return true;
		} 
	}
	return false;
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
function takeSnapShot(list, lostImg){
	chrome.storage.local.get('undoObj', function(data){
		var undoObj = data.undoObj === undefined ? {'index': 0, 'groupList': []} : data.undoObj;

		if (undoObj.index < undoObj.groupList.length - 1){
			undoObj.groupList.splice(undoObj.index + 1);
		}
		var grpList = list.groups;
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



