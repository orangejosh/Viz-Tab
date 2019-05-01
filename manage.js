


var dragTarget;

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse){
		if (request.page === 'redraw'){
			redrawPage();
		}
	}
)

function redrawPage(){
	chrome.storage.local.get('groups', function(data){
		rebuildPage(data);
	});
}

/****************** Manage Groups Start *******************/ 

function setActiveGroup(index, data){
	for (var i = 0; i < data.groups.length; i++){
		var aGroup = data.groups[i];
		if (i === index){
			aGroup.active = true;
		} else {
			aGroup.active = false;
		}
	}
}

function switchGroup(id){
	var activeGroup;
	chrome.storage.local.get('groups', function(data){
		for (var i = 0; i < data.groups.length; i++){
			var aGroup = data.groups[i];
			if (aGroup.id === id){
				if (aGroup.active === true){
					return;
				}
				aGroup.active = true;
				activeGroup = aGroup;
			} else {
				aGroup.active = false;
			}
		}

		chrome.storage.local.set(data, function(){
			var tabList = document.getElementsByClassName('tabButton');
			for (var i = 0; i < tabList.length; i++){
				var tab = tabList[i];
				var name = tab.getElementsByClassName('tabTitle')[0].innerHTML;
				if (activeGroup.name === name){
					var img = tab.getElementsByClassName('tabImage')[0];
					img.src = 'images/tabOn.png';
					var title = tab.getElementsByClassName('tabTitle')[0];
					title.style.color = 'black';				
				} else {
					var img = tab.getElementsByClassName('tabImage')[0];
					img.src = 'images/tabOff.png';
					var title = tab.getElementsByClassName('tabTitle')[0];
					title.style.color = 'grey';							
				}
			}
			clearPage();
			buildPages(data);
			toggleGroupRows();
			//takeSnapShot(data);
			redrawPage();
		})
	})
}

function renameGroup(groupName){
	var tabs = document.getElementsByClassName('tabButton');
	for (var i = 0; i < tabs.length; i++){
		var tab = tabs[i];
		var title = tab.getElementsByClassName('tabTitle')[0].innerHTML;
		if (title === groupName){
			var input = tab.getElementsByClassName('tabTitleInput')[0];
			input.style.visibility = 'visible';
			input.focus();

			return;
		}
	}
}

function saveGroupName(name){
	chrome.storage.local.get('groups', function(data){
		var newName = checkSameName(name, grpList);
		for (var i = 0; i < data.groups.length; i++){
			if (data.groups[i].active){
				data.groups[i].name = name;
				chrome.storage.local.set(data, function() {
					rebuildPage(data);
//					takeSnapShot(data);
					redrawPage();
				});
				return;
			}
		}
	});
}

function reOrderGroups(event){
	var box = document.getElementById('groupBox');

	if (getTargetIndex(dragTarget, 'tabButton') > getTargetIndex(event.target, 'tabButton')){
		box.insertBefore(dragTarget, event.target);
		allignGroups();
	} else {
		box.insertBefore(dragTarget, event.target.nextSibling);
		allignGroups();
	}
}

function allignGroups(){
	chrome.storage.local.get('groupToggle', function(toggle){
		var groupBox = document.getElementById('groupBox');
		var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
		var tabs = groupBox.getElementsByClassName('tabButton');
		var rows = Math.ceil(tabs.length / rowLength);

		if (rows === 1){
			var pageBox = document.getElementById('pageBox');
			var openButton = document.getElementById('openAll');
			pageBox.style.top ='0px';
			// if (openButton != null){
			// 	openButton.style.top ='-23px';
			// }
		}

		for (var i = 0; i < tabs.length; i++){
			if (i % rowLength === 0){
				rows--;
			}
			var tab = tabs[i];
			if (toggle.groupToggle === true){
				tab.style.top = rows * 7 - 2 + 'px';
			} else {
				tab.style.top = rows * 23 - 2 + 'px';
			}
			tab.style.zIndex = rows;
		}
	})

}

function saveNewGroupOrder(){
	chrome.storage.local.get('groups', function(data){
		var newGroupOrder= [];

		var tabList = document.getElementsByClassName('tabButton');
		for (var i = 0; i < tabList.length; i++){
			var tab = tabList[i];
			var title = tab.getElementsByClassName('tabTitle')[0].innerHTML;

			for (var k = 0; k < data.groups.length; k++){
				var group = data.groups[k];
				if (group.name === title){
					newGroupOrder.push(group);
					break;
				}
			}
		}
		data.groups = newGroupOrder;
		chrome.storage.local.set(data, function(){
//			takeSnapShot(data);
			redrawPage();
		});
	});
}

function closeGroup(groupName){
	chrome.storage.local.get('groups', function(data){
		for (var i = 0; i < data.groups.length; i++){
			var group = data.groups[i];
			if (group.name === groupName){
				var removeGroup = data.groups.splice(i, 1);
				var remGrpID = removeGroup[0].id;
				if (group.active === true){
					setActiveIndex(i, data.groups);
				}

				chrome.storage.local.set(data, function(){
					//TODO This needs to be fixed
					/*
					chrome.storage.local.get(remGrpID, function(data){
						var imgGrp = createLostImage(
							'close', 
							remGrpID, 
							true, 
							data[remGrpID]
						);
						takeSnapShot(list, imgGrp);
						chrome.storage.local.remove(remGrpID, function(){
							rebuildPage(list);
							allignGroups();
							redrawPage();
						});
					})
					*/
				});
				break;
			}
		}
	})
}

function reGroupPage(pageBlock, newGroupID) {
	chrome.storage.local.get('groups', function(data){
		var activeGroup = getActiveGroup(data);
		//TODO this needs to be fixed

		chrome.storage.local.get(activeGroup.id, function(data1){
			chrome.storage.local.get(newGroupID, function(data2){
				var grpList = list.groupList;
				var activeGroup = getActiveGroup(list);
				var pageID = pageBlock.getElementsByTagName('a')[0].id;

				var page;

				for (var i = 0; i < activeGroup.pageList.length; i++){
					var aPage = activeGroup.pageList[i];
					if (aPage.url === pageID){
						page = activeGroup.pageList.splice(i, 1)[0];
						break;
					}
				}
				for (var j = 0; j < grpList.length; j++){
					var group = grpList[j];
					if (group.id === newGroupID){
						group.pageList.push(page);
						break;
					}
				}

				var imgObj;

				for (var k = 0; k < data1[activeGroup.id].length; k++){
					if (data1[activeGroup.id][k].url === page.url){
						imgObj = data1[activeGroup.id].splice(k, 1)[0];
						break;
					}
				}
				data2[newGroupID].push(imgObj);
				var lostImg = createLostImage(
					'move',
					activeGroup.id,
					false,
					[imgObj],
					newGroupID
				);
				chrome.storage.local.set(list, function(){
					chrome.storage.local.set(data1, function(){
						chrome.storage.local.set(data2, function (){
							rebuildPage(list);
							takeSnapShot(list, lostImg);
							redrawPage();
						})
					})
				})
			})
		})
	})
}

/****************** Manage Groups End *******************/



/****************** Manage Pages Start *******************/ 

function savePageName(newName, url){
	chrome.storage.local.get('groups', function(data){
		var grpList = data.groups;
		var activeGroup = getActiveGroup(data);

		for (var i = 0; i < activeGroup.pageList.length; i++){
			var page = activeGroup.pageList[i];
			if (page.url === url){
				page.title = newName;
				chrome.storage.local.set(data, function(){
					rebuildPage(data);
					//takeSnapShot(data);
					redrawPage();
				});
			}
		}
	});
}

function reOrderPages(event){
	var box = document.getElementById('pageBox');

	if (getTargetIndex(dragTarget, 'pageBlock') > getTargetIndex(event.target, 'pageBlock')){
		box.insertBefore(dragTarget, event.target);
	} else {
		box.insertBefore(dragTarget, event.target.nextSibling);
	}
}

function saveNewPageOrder(){
	chrome.storage.local.get('groups', function(data){
		var activeGroup = getActiveGroup(data);
		var pageList = activeGroup.pageList;
		var newPageList = [];

		var columnList = document.getElementsByClassName('pageBlock');
		for (var i = 0; i < columnList.length; i++){
			var column = columnList[i];
			var url = column.getElementsByTagName('a')[0].id;

			for (var j = 0; j < pageList.length; j++){
				var page = pageList[j];
				if (page.url === url){
					newPageList.push(page);
					break;
				}
			}
		}
		activeGroup.pageList = newPageList;
		chrome.storage.local.set(data, function(){
//			takeSnapShot(data);
			redrawPage();
		});
	})
}

function closePage(id){
	chrome.storage.local.get('groups', function(data){
		var columnList = document.getElementsByClassName('pageBlock');

		for (var i = 0; i < columnList.length; i++){

			var pageBlock = columnList[i];
			var button = pageBlock.getElementsByClassName('closeButton');
//			var url = pageBlock.getElementsByTagName('a')[0].id;

			if (button[0].id === id){
//				pageBlock.parentElement.removeChild(pageBlock);
				var activeGroup = getActiveGroup(data);

				activeGroup.pageList.splice(i, 1);
				chrome.storage.local.set(data, function(){
//					takeSnapShot(list, imgObj);
					redrawPage();
				});
				return;
			}
		}
	});
}

function openAllPages(){
//TODO do we need a pages
	chrome.storage.local.get('groups', function(data){
		var activeGroup = getActiveGroup(data);
		var pageList = activeGroup.pageList;
		var scrollList = [];

		for (var i = 0; i < pageList.length; i++){
			var page = pageList[i];

			var scrollObj = {
				url: page.url,
				scroll: page.scroll
			}
			scrollList.push(scrollObj);
		}
		chrome.storage.local.set({pages: scrollList}, function(){
			for (var j = 0; j < scrollList.length; j++){
				var scrollObj = scrollList[j];
				window.open(scrollObj.url, '_blank');
			}
		})
	})
}

/****************** Manage Groups End *******************/


function rebuildPage(data){
	clearURL();
	buildGroups(data);
	buildPages(data);
}

function clearURL(){
	var help = document.getElementsByClassName('help');
	var i = help.length - 1;
	while (i >= 0){
		help[i].parentNode.removeChild(help[i]);
		i--;
	}

	var pageBox = document.getElementById('pageBox');
	while(pageBox.hasChildNodes()) {
		pageBox.removeChild(pageBox.lastChild);
	}

	var groupBox = document.getElementById('groupBox');
	while(groupBox.hasChildNodes()) {
		groupBox.removeChild(groupBox.lastChild);
	}
}

function clearPage(){
	var pageBox = document.getElementById('pageBox');
	while(pageBox.hasChildNodes()) {
		pageBox.removeChild(pageBox.lastChild);
	}

	var openAll = document.getElementById('openAll');
	if (openAll !== null){
		openAll.parentNode.removeChild(openAll);
	}
}

function createLostImage(action, groupID, newGroup, imgData, newGroupID){
	var imgObj = {
		'action': action,
		'id': groupID,
		'newGroup': newGroup,
		'imgData': imgData,
		'newID': newGroupID
	}
	return imgObj;
}

function takeSnapShot(list, img){
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
		var addObj = {'snapshot': snapShot, 'lostImgs': img};
		undoObj.list.push(addObj);
		undoObj.index = undoObj.list.length - 1;
		data.undoObj = undoObj;

		chrome.storage.local.set(data);
	})
}

function checkSameName(name, list){
	if (list === undefined || list.length === 0){
		return name;
	}
	var baseName = String(name);
	var newName = String(name);
	var addName = 0;
	var nameOnList = true;

	while(nameOnList === true){
		for (var i = 0; i < list.length; i++){
			var aName = list[i].name;
			if (aName === newName){
				addName += 1;
				newName = baseName + '(' + addName + ')';
				break;
			} else if (i === list.length - 1){
				nameOnList = false;
			}
		}
	}
	return newName;
}

function getTargetIndex(target, elem){
	var objs = document.getElementsByClassName(elem);

	for (var i = 0; i < objs.length; i++){
		var aObj = objs[i];
		if (target === aObj){
			return i;
		}
	}
}

function setActiveIndex(index, groupList){
	if (groupList.length === 0){
		return;
	} else if (index === groupList.length){
		setActiveGroup(index-1, groupList)
	} else {
		setActiveGroup(index, groupList);
	} 
}

function startDragBlock(target){
	var elem = document.getElementsByClassName('dragBlock');
	for (var i = 0; i < elem.length; i++){
		if (elem[i] !== target){
			elem[i].style.pointerEvents = 'none';
		}
	}
}

function stopDragBlock(){
	var elem = document.getElementsByClassName('dragBlock');
	for (var i = 0; i < elem.length; i++){
		elem[i].style.pointerEvents = 'visible';
	}
}

