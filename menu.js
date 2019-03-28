


function undo() {
	chrome.storage.local.get('undoObj', function(data){
		if (data.undoObj === undefined){
			data.undoObj = {'index': 0, 'list': []};
		}
		var undoObj = data.undoObj;

		undoObj.index--;
		if (undoObj.index < 0){
			undoObj.index = 0;
			return;
		}
		chrome.storage.local.get('groupList', function(list){
			list.groupList = undoObj.list[undoObj.index].snapshot;
			chrome.storage.local.set(list, function(){
				chrome.storage.local.set(data, function(){
					syncImgLists(undoObj, undoObj.index + 1, undoObj.index, list);
				});
			})
		})
	})
}

function redo() {
	chrome.storage.local.get('undoObj', function(data){
		if (data.undoObj === undefined){
			data.undoObj = {'index': 0, 'list': []};
		}
		var undoObj = data.undoObj;

		undoObj.index++;
		if (undoObj.index > undoObj.list.length - 1){
			undoObj.index = undoObj.list.length - 1;
			return;
		}
		chrome.storage.local.get('groupList', function(list){
			list.groupList = undoObj.list[undoObj.index].snapshot;
			chrome.storage.local.set(list, function(){	
				chrome.storage.local.set(data, function(){
					syncImgLists(undoObj, undoObj.index - 1, undoObj.index, list);
				});
			})
		})
	})
}

function syncImgLists(undoObj, oldIndex, newIndex, list){
	var oldList = undoObj.list[oldIndex];
	var newList = undoObj.list[newIndex];
	var undo = oldIndex > newIndex;
	var lostImg = undo ? oldList.lostImgs : newList.lostImgs;

	if (undo && lostImg != undefined){
		if (lostImg.action === 'add' && lostImg.newGroup === true){
			undoAddGroup(lostImg, list);
		} else if (lostImg.action === 'add'){
			undoAddPages(lostImg, list);
		} else if (lostImg.action === 'close' && lostImg.newGroup === true){
			undoCloseGroup(lostImg, list);
		} else if (lostImg.action === 'close'){
			undoClosePages(lostImg, list);
		} else if (lostImg.action === 'move'){
			undoMovePage(lostImg, list);
		}
	} else if (!undo && lostImg != undefined){
		if (lostImg.action === 'add' && lostImg.newGroup === true){
			redoAddGroup(lostImg, list);
		} else if (lostImg.action === 'add'){
			redoAddPages(lostImg, list);
		} else if (lostImg.action === 'close' && lostImg.newGroup === true){
			redoCloseGroup(lostImg, list);
		} else if (lostImg.action === 'close'){
			redoClosePages(lostImg, list);
		} else if (lostImg.action === 'move'){
			redoMovePage(lostImg, list);
		}
	} else {
		rebuildPage(list);
		sendRedraw();
	}
}

function undoAddGroup(lostImg, list){
	chrome.storage.local.remove(lostImg.id, function(){
		rebuildPage(list);
		allignGroups();
		sendRedraw();
	})
}

function undoAddPages(lostImg, list){
	chrome.storage.local.get(lostImg.id, function(data){
		for (var i = 0; i < lostImg.imgData.length; i++){
			for (var j = 0; j < data[lostImg.id].length; j++){
				if (lostImg.imgData[i].url === data[lostImg.id][j].url){
					data[lostImg.id].splice(j, 1);
					break;
				}
			}
		}
		chrome.storage.local.set(data, function(){
			rebuildPage(list);
			sendRedraw();
		});
	});
}

function undoCloseGroup(lostImg, list){
	chrome.storage.local.set({[lostImg.id]: lostImg.imgData}, function(){
		rebuildPage(list);
		allignGroups();
		sendRedraw();
	})
}

function undoClosePages(lostImg, list){
	chrome.storage.local.get(lostImg.id, function(data){
		data[lostImg.id].push({'img': lostImg.imgData[0].img, 'url': lostImg.imgData[0].url});
		chrome.storage.local.set(data, function(){
			rebuildPage(list);
			sendRedraw();
		});
	})
}

function undoMovePage(lostImg, list){
	chrome.storage.local.get(lostImg.newID, function(data1){
		chrome.storage.local.get(lostImg.id, function(data2){
			var imgObj = data1[lostImg.newID];
			var page;
			for (var i = 0; i < imgObj.length; i++){
				var aPage = imgObj[i];
				if (aPage.url === lostImg.imgData[0].url){
					page = data1[lostImg.newID].splice(i, 1)[0];
					break;
				}
			}
			data2[lostImg.id].push(page);

			chrome.storage.local.set(data1, function(){
				chrome.storage.local.set(data2, function(){
					rebuildPage(list);
					sendRedraw();		
				})
			})
		})
	})
}

function redoAddGroup(lostImg, list){
	chrome.storage.local.set({[lostImg.id]: lostImg.imgData}, function(){
		rebuildPage(list);
		allignGroups();
		sendRedraw();
	});
}

function redoAddPages(lostImg, list){
	chrome.storage.local.get(lostImg.id, function(data){
		data[lostImg.id] = data[lostImg.id].concat(lostImg.imgData);
		chrome.storage.local.set(data, function(){
			rebuildPage(list);
			sendRedraw();
		});
	});
}

function redoCloseGroup(lostImg, list){
	chrome.storage.local.remove(lostImg.id, function(data){
		rebuildPage(list);
		allignGroups();
		sendRedraw();
	})
}

function redoClosePages(lostImg, list){
	chrome.storage.local.get(lostImg.id, function(data){
		for (var i = 0; i < data[lostImg.id].length; i++){
			if (data[lostImg.id][i].url === lostImg.imgData[0].url){
				data[lostImg.id].splice(i, 1);
				break;
			}
		}
		chrome.storage.local.set(data, function(){
			rebuildPage(list);
			sendRedraw();
		});
	})
}

function redoMovePage(lostImg, list){
	chrome.storage.local.get(lostImg.id, function(data1){
		chrome.storage.local.get(lostImg.newID, function(data2){
			var imgObj = data1[lostImg.id];
			var page;
			for (var i = 0; i < imgObj.length; i++){
				var aPage = imgObj[i];
				if (aPage.url === lostImg.imgData[0].url){
					page = data1[lostImg.id].splice(i, 1)[0];
					break;
				}
			}
			data2[lostImg.newID].push(page);
			chrome.storage.local.set(data1, function(){
				chrome.storage.local.set(data2, function(){
					rebuildPage(list);
					sendRedraw();		
				})
			})
		})
	})
}

function help() {
	var pageList = [
			{'scroll': 0, 'title': 'Google', 'url': 'https://www.google.com'},
			{'scroll': 0, 'title': 'Bing', 'url': 'https://www.bing.com'}
		]
	var group1 = createDummyGroup(true, 'SearchEngines', pageList);
	var group2 = createDummyGroup(false, 'Shopping', []);
	var group3 = createDummyGroup(false, 'Work', []);
	var group4 = createDummyGroup(false, 'Fun', []);

	var groupList = {
		'groupList':[group1, group2, group3, group4]
	}

	var imgObj = [
		{'img': '/images/google.jpg', 'url': 'https://www.google.com'},
		{'img': '/images/bing.jpg', 'url': 'https://www.bing.com'}
	]
	createHelpPage(groupList, imgObj);
}

function createDummyGroup(active, name, pageList){
	var group = {
		'active': active,
		'id': '',
		'name': name,
		'pageList': pageList
	}
	return group;
}

function createHelpPage(groupList, imgObj){
	var pageScreen = document.createElement('div');
	pageScreen.id = 'screen';
	rebuildPage(groupList, imgObj);
	document.body.insertBefore(pageScreen, document.body.firstChild);

	pageScreen.addEventListener('click', function(){
		document.body.removeChild(pageScreen);
		chrome.storage.local.get('groupList', function(list){
			rebuildPage(list);
		})
	})

	var pageBox = document.getElementById('pageBox');

	var clickImg = document.createElement('img');
	clickImg.src = '/images/click.png';
	clickImg.id = 'click';

	var openImg = document.createElement('img');
	openImg.src = '/images/open.png';
	openImg.id = 'open';

	pageBox.appendChild(clickImg);
	pageBox.appendChild(openImg);

	var dragImg = document.createElement('img');
	dragImg.src = '/images/drag.png';
	dragImg.id = 'drag';

	var navImg = document.createElement('img');
	navImg.src = 'images/navigate.png';
	navImg.id = 'nav';

	var dragDiv = document.createElement('div');
	dragDiv.id = 'dragDiv';
	dragDiv.className = 'help';

	dragDiv.appendChild(dragImg);
	dragDiv.appendChild(navImg);

	var pageBox = document.getElementById('pageBox');
	pageBox.parentNode.insertBefore(dragDiv, pageBox.nextSibling);
}

function toggleMenu(){
	var menuList = document.getElementById('menuList');
	var menu = document.getElementById('menuButton');
	if (menuList.style.display === 'none'){
		menuList.style.display = 'block';
	} else {
		menuList.style.display = 'none';
	}
}

function openDonatePage(){
	window.open("/donate.html", "_blank");	
}
