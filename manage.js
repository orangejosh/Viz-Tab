/**************************************************************************
 * manage.js
 *
 * A content script that manages the dynamic aspects of the Viz-Tab.
 * It handles the switching of groups, the renaming of groups, the
 * reording of groups, the closing of groups. Also handles the renaming
 * of pages, reording of pages, closing of pages, and opening all
 * pages of a group.
 *
/**************************************************************************/

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
			chrome.runtime.sendMessage({save: 'save'});
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
		var newName = checkSameName(name, data.groups);
		for (var i = 0; i < data.groups.length; i++){
			if (data.groups[i].active){
				data.groups[i].name = name;
				chrome.storage.local.set(data, function() {
					rebuildPage(data);
					chrome.runtime.sendMessage({save: 'save'});
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
			chrome.runtime.sendMessage({save: 'save'});
			redrawPage();
		});
	});
}

function closeGroup(groupName){
	chrome.storage.local.get('groups', function(data){
		for (var i = 0; i < data.groups.length; i++){
			var group = data.groups[i];
			if (group.name === groupName){
				data.groups.splice(i, 1);
				if (group.active === true){
					setActiveIndex(i, data);
				}

				chrome.storage.local.set(data, function(){
					chrome.runtime.sendMessage({save: 'save'});
					redrawPage();
				});
				break;
			}
		}
	})
}

function reGroupPage(page, target) {
	chrome.storage.local.get('groups', function(data){
		var activeGroup = getActiveGroup(data);

		var targetGroup;
		for (var i = 0; i < data.groups.length; i++){
			var aGroup = data.groups[i];
			if (aGroup.id === target.id){
				targetGroup = aGroup;
				break;
			}
		}

		var pageURL= page.getElementsByTagName('a')[0].id;
		var pageObj;
		for (var i = 0; i < activeGroup.pageList.length; i++){
			var aPage = activeGroup.pageList[i];
			if (aPage.url === pageURL){
				pageObj = activeGroup.pageList[i];				
				activeGroup.pageList.splice(i, 1);
				break;
			}
		}

		targetGroup.pageList.push(pageObj);

		chrome.storage.local.set(data, function(){
			chrome.runtime.sendMessage({save: 'save'});
			redrawPage();
		});
	});
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
					chrome.runtime.sendMessage({save: 'save'});
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
			chrome.runtime.sendMessage({save: 'save'});
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

			if (button[0].id === id){
				var activeGroup = getActiveGroup(data);

				activeGroup.pageList.splice(i, 1);
				chrome.storage.local.set(data, function(){
					chrome.runtime.sendMessage({save: 'save'});
					redrawPage();
				});
				return;
			}
		}
	});
}

function openAllPages(){
	chrome.storage.local.get('groups', function(data){
		var activeGroup = getActiveGroup(data);
		var pageList = activeGroup.pageList;

		for (var i = 0; i < pageList.length; i++){
			var page = pageList[i];
			chrome.tabs.create({url: page.url}, function(tab){
				// TODO Get this to work
				//chrome.runtime.sendMessage({scroll: tab.id + " " + page.scroll});
			});
		}
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

function setActiveIndex(index, data){
	if (data.groups.length === 0){
		return;
	} else if (index === data.groups.length){
		setActiveGroup(index-1, data)
	} else {
		setActiveGroup(index, data);
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

