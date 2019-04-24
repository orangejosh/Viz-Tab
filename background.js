
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse){
		if (request.onePage !== undefined){
			setGroup(request.onePage, true);
		} else if (request.allPages !== undefined){
			setGroup(request.allPages, false);
		}
		sendResponse({complete: 'true'});
	}
)

chrome.tabs.onCreated.addListener(function(tab) {
	if (tab.url === "chrome://newtab/"){
		chrome.storage.local.get('newTab', function(data){
			var newTabOn = data.newTab === undefined || data.newTab === false ? false : true
			if (newTabOn){
				chrome.tabs.update(tab.id, {
					url: chrome.extension.getURL("newTab.html")
				})
			}
		})
	}
})

function setGroup(name, oneTab){
	chrome.storage.local.get('groupList', function(list){
		if (list.groupList === undefined){
			list.groupList = [];
		}

		var grpList = list.groupList;

		for (var i = 0; i < grpList.length; i++){
			var aGroup = grpList[i];
			if (name === aGroup.name){
				setActiveGroup(aGroup, list, oneTab, false);
				return;
			}
		}
		aGroup = {
			'id': (new Date()).getTime().toString(),
			'name': name,
			'active': true,
			'pageList': []
		}
		list.groupList.push(aGroup);
		setActiveGroup(aGroup, list, oneTab, true);
	})
}

function setActiveGroup(group, list, oneTab, newGroup){
	for (var i = 0; i < list.groupList.length; i++){
		var aGroup = list.groupList[i];
		if (aGroup === group){
			aGroup.active = true;
		} else {
			aGroup.active = false;
		}
	}
	if (oneTab === true){
		storeOnePage(group, list, newGroup);
	} else {
		chrome.tabs.query({currentWindow: true}, function(theTabs){
			storeAllPages(group, 0, theTabs, list, newGroup)
		})
	}
}

/***************STORE ONE PAGE START****************/

function storeOnePage(activeGroup, list, newGroup) {
	chrome.tabs.query({active:true, currentWindow: true}, function(tabs){
		if (checkForDuplicates(activeGroup.pageList, tabs[0].url)){
			getImageGroup(activeGroup, tabs[0].url, list, newGroup);
			return;
		}
		chrome.tabs.sendMessage(tabs[0].id, {page: 'getScroll'}, function(response){
			var scroll = response === undefined ? 0 : response.scroll;
			var aPage = {
				'groupID': activeGroup.id,
				'url': tabs[0].url,
				'title': tabs[0].title,
				'scroll': scroll
			}
			activeGroup.pageList.push(aPage);
			getImageGroup(activeGroup, aPage.url, list, newGroup);
		});
	})
}

function getImageGroup(activeGroup, url, list, newGroup){
	chrome.storage.local.get(activeGroup.id, function(imgList){
		if (imgList[activeGroup.id] === undefined){
			imgList[activeGroup.id] = [];
		}

		var storedList = imgList[activeGroup.id];
		for (var i = 0; i < storedList.length; i++){
			var imgObj = storedList[i];
			if (imgObj.url === url){
				if (imgObj.img === '/images/missingImg.jpg'){
					storedList.splice(i, 1);
					captureOneTab(activeGroup, url, imgList, list, newGroup)
					return;
				} else {
					return;
				}
			}
		}
		captureOneTab(activeGroup, url, imgList, list, newGroup);
	})
}

function captureOneTab(activeGroup, url, imgList, list, newGroup){
	chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
		if (chrome.extension.lastError){
			var imgObj = {'url': url, 'img': '/images/missingImg.jpeg'};
			captureTabImage(imgObj, activeGroup, imgList, list, newGroup);
			return;
		}
		var image = new Image();
		image.src = img;

		image.onload = function() {
			var newImg = scaleImage(image);
			var imgObj = {'url': url, 'img': newImg};
			captureTabImage(imgObj, activeGroup, imgList, list, newGroup);
		}
	})	
}

function captureTabImage(imgObj, activeGroup, imgList, list, newGroup) {
	imgList[activeGroup.id].push(imgObj);
	chrome.storage.local.set(imgList, function(){
		chrome.storage.local.set(list, function(){
			sendRedraw();
			var lostImg = createLostImage(
				'add',
				activeGroup.id,
				newGroup,
				[{'img': imgObj.img, 'url': imgObj.url}]
			)
			takeSnapShot(list,lostImg);
		});
	});	
}

/***************STORE ONE PAGE END****************/




/***************STORE ALL PAGE START****************/

var activeTab;

function storeAllPages(activeGroup, index, tabs, list, newGroup){
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
			storeAllImages(0, activeGroup, tabs, imgList, list, lostImg);
		})
		return;
	}

	var tab = tabs[index];
	if (tab.active){
		activeTab = tab;
	}
	if (checkForDuplicates(activeGroup.pageList, tab.url)){
		index++;
		storeAllPages(activeGroup, index, tabs, list, newGroup);
		return;
	}

	chrome.tabs.sendMessage(tab.id, {page: 'getScroll'}, function(response){
		var scroll = response === undefined ? 0 : response.scroll;
		var data = {
			'url': tab.url,
			'title': tab.title,
			'scroll': scroll
		}
		activeGroup.pageList.push(data);
		storeAllPages(activeGroup, index++, tabs, list, newGroup);
	})
}

function storeAllImages(index, activeGroup, tabList, imgList, list, lostImg){
	if (index >= tabList.length){
		if (activeTab !== undefined){
			chrome.tabs.update(activeTab.id, {active: true});
		}
		chrome.storage.local.set(imgList, function(){
			chrome.storage.local.set(list, function(){
				sendRedraw();
				takeSnapShot(list, lostImg);
			})
		})
		return;
	}

	var tab = tabList[index];
	chrome.tabs.update(tab.id, {active:true}, function(){
		if (tab.url.substring(0,9) === 'chrome://'){
			storeAllImages(index+1, activeGroup, tabList, imgList, list, lostImg);
			return;
		}

		var storedList = imgList[activeGroup.id];
		for (var i = 0; i < storedList.length; i++){
			var imgObj = storedList[i];
			if (imgObj.url === tab.url){
				if (imgObj.img === '/images/missingImg.jpg'){
					storedList.splice(i, 1);
					captureAllTabs(index, activeGroup, tabList, imgList, list, lostImg)
					return;
				} else {
					storeAllImages(index+1, activeGroup, tabList, imgList, list, lostImg);
					return;
				}
			}
		}
		captureAllTabs(index, activeGroup, tabList, imgList, list, lostImg);
	});
}

function captureAllTabs (index, activeGroup, tabList, imgList, list, lostImg){
	var tab = tabList[index];
	chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {}, function(img){
		if (chrome.extension.lastError){
			var imgObj = {'url': tab.url, 'img': '/images/missingImg.jpg'};
			imgList[activeGroup.id].push(imgObj);
			lostImg.imgData.push(imgObj);
			storeAllImages(index+1, activeGroup, tabList, imgList, list, lostImg);
			return;
		}
		var image = new Image();
		image.src = img;

		image.onload = function() {
			var newImg = scaleImage(image);
			var imgObj = {'url': tab.url, 'img': newImg};
			imgList[activeGroup.id].push(imgObj);
			lostImg.imgData.push(imgObj);
			storeAllImages(index+1, activeGroup, tabList, imgList, list, lostImg);
		}
	});	
}
/***************STORE ALL PAGE END****************/


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

function takeSnapShot(list, lostImg){
	chrome.storage.local.get('undoObj', function(data){
		var undoObj = data.undoObj === undefined ? {'index': 0, 'list': []} : data.undoObj;

		if (undoObj.index < undoObj.list.length - 1){
			undoObj.list.splice(undoObj.index + 1);
		}
		var grpList = list.groupList;
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
		undoObj.list.push(addObj);
		undoObj.index = undoObj.list.length - 1;
		data.undoObj = undoObj;

		chrome.storage.local.set(data);
	})
}



