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
			chrome.storage.local.get(null, function(data){
				redrawPage(data);
			});
		}
	}
)

function redrawPage(data){
	clearURL();
	buildGroups(data);
	buildPages(data);
}

/****************** Manage Groups Start *******************/ 

function switchGroup(id){
	var activeGroup;
	chrome.storage.local.get(null, function(data){
		for (var i = 0; i < data.groups.length; i++){
			var aGroup = data.groups[i];
			if (aGroup.id === id){
				if (data.activeIndex === i){
					return;
				}
				data.activeIndex = i;
				activeGroup = aGroup;
			}
		}

		chrome.storage.local.set(data, function(){
			//toggleGroupRows();
			chrome.runtime.sendMessage({save: 'save'});
			redrawPage(data);
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
	chrome.storage.local.get(null, function(data){
		var newName = checkSameName(name, data.groups);
		data.groups[data.activeIndex].name = newName;
		chrome.storage.local.set(data, function(){
			chrome.runtime.sendMessage({save: 'save'});
			redrawPage(data);
		});
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
			/*
			if (toggle.groupToggle === true){
				tab.style.top = rows * 7 - 2 + 'px';
			} else {
				tab.style.top = rows * 23 - 2 + 'px';
			}
			*/
			tab.style.zIndex = rows;
		}
	})
}

function saveNewGroupOrder(activeTabId){
	chrome.storage.local.get(null, function(data){
		var newGroupOrder= [];

		var tabList = document.getElementsByClassName('tabButton');
		for (var i = 0; i < tabList.length; i++){
			var tab = tabList[i];
			var title = tab.getElementsByClassName('tabTitle')[0].innerHTML;

			for (var k = 0; k < data.groups.length; k++){
				var group = data.groups[k];
				if (group.name === title){
					newGroupOrder.push(group);
					if (group.id === activeTabId){
						data.activeIndex = i;
					}
					break;
				}
			}
		}
		data.groups = newGroupOrder;
		chrome.storage.local.set(data, function(){
			chrome.runtime.sendMessage({save: 'save'});
		});
	});
}

function closeGroup(groupName){
	chrome.storage.local.get(null, function(data){
		for (var i = 0; i < data.groups.length; i++){
			var group = data.groups[i];
			if (group.name === groupName){
				data.groups.splice(i, 1);
				if (data.activeIndex >= i){
					data.activeIndex--; 
				}
				if (data.activeIndex < 0 && data.groups.length > 0){
					data.activeIndex = 0;
				} else if (data.activeIndex < 0){
					data.activeIndex = undefined;
				}

				chrome.storage.local.set(data, function(){
					chrome.runtime.sendMessage({save: 'save'});
					redrawPage(data);
				});
				break;
			}
		}
	})
}

function addNewGroup() {
	chrome.storage.local.get(null, function(data){
		var d = new Date();
		var date = d.toLocaleDateString();
		var name = checkSameName(date, data.groups);
		var aGroup = {
			'id': (new Date()).getTime().toString(),
			'name': name,
			'pageList': []
		}
		data.groups.push(aGroup);
		data.activeIndex = data.groups.length - 1;
		chrome.storage.local.set(data, function(){
			chrome.runtime.sendMessage({save: 'save'});
			redrawPage(data);
		});
	});
}

function reGroupPage(page, target) {
	chrome.storage.local.get(null, function(data){
		var activeGroup = data.groups[data.activeIndex];

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
			redrawPage(data);
		});
	});
}

/****************** Manage Groups End *******************/



/****************** Manage Pages Start *******************/ 

function savePageName(newName, url){
	chrome.storage.local.get(null, function(data){
		var grpList = data.groups;
		var activeGroup = data.groups[data.activeIndex];

		for (var i = 0; i < activeGroup.pageList.length; i++){
			var page = activeGroup.pageList[i];
			if (page.url === url){
				page.title = newName;
				chrome.storage.local.set(data, function(){
					chrome.runtime.sendMessage({save: 'save'});
					redrawPage(data);
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
	chrome.storage.local.get(null, function(data){
		var activeGroup = data.groups[data.activeIndex];
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
		});
	})
}

function closePage(id){
	chrome.storage.local.get(null, function(data){
		var columnList = document.getElementsByClassName('pageBlock');

		for (var i = 0; i < columnList.length; i++){
			var pageBlock = columnList[i];
			var button = pageBlock.getElementsByClassName('closeButton');

			if (button[0].id === id){
				var activeGroup = data.groups[data.activeIndex];

				activeGroup.pageList.splice(i, 1);
				chrome.storage.local.set(data, function(){
					chrome.runtime.sendMessage({save: 'save'});
					redrawPage(data);
				});
				return;
			}
		}
	});
}

function openAllPages(){
	chrome.storage.local.get(null, function(data){
		var activeGroup = data.groups[data.activeIndex];
		var pageList = activeGroup.pageList;

		for (var i = 0; i < pageList.length; i++){
			var page = pageList[i];

			if (i === 0 && !data.openTab){
				window.open(page.url, "_self");
			} else {
				chrome.tabs.create({url: page.url, active: false}, function(tab){
					// TODO Get this to work
					//chrome.runtime.sendMessage({scroll: tab.id + " " + page.scroll});
				});
			}
		}
	})
}

/****************** Manage Groups End *******************/

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

/*
 * If there are many rows of groups they can be collapsed so as to take less space.
 */
function toggleGroupRows() {
	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
	var tabs = document.getElementsByClassName('tabButton');
	var rows = Math.ceil(tabs.length / rowLength);

	var groupSwitch = document.getElementById('groupSwitch')
	var toggle = document.getElementById('expandToggle');
	var pageBox = document.getElementById('pageBox');
	var openButton = document.getElementById('openAll');

	if (toggle === null){
		return;
	} else if (groupSwitch.checked){
		toggle.style.background = 'url("images/downArrow.png") no-repeat';

		for (var i = 0; i < tabs.length; i++){
			if (i % rowLength === 0){
				rows--;
			}

			for (var j = 0; j < tabs[i].children.length; j++){
				tabs[i].children[j].hidden = false;
			}
		}
		chrome.storage.local.set({'groupToggle': true});
	} else {
		toggle.style.background = 'url("images/upArrow.png") no-repeat';

		var firstRow = rows - 1;
		for (var i = 0; i < tabs.length; i++){
			if (i % rowLength === 0){
				rows--;
			}
			//tabs[i].style.top = rows * 23 - 2 + 'px';

			if (rows !== firstRow){
				var children = tabs[i].children;
				for (var j = 0; j < children.length; j++){
					if (!children[j].classList.contains('tabImage')){
						children[j].hidden = true;
					}
				}
			}
		}
		chrome.storage.local.set({'groupToggle': false});
	}
	toggle.style.backgroundSize = '100% auto';	
}

