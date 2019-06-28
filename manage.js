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

var GROUPMARGIN = 70;
var TABWIDTH = 144;
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
	// Clears the dynamic elements from the page
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

	buildGroups(data);
	buildPages(data);
}

/****************** Manage Groups Start *******************/ 

function switchGroup(id){
	chrome.storage.local.get(null, function(data){
		for (var i = 0; i < data.groups.length; i++){
			if (data.groups[i].id === id){
				data.activeIndex = i;
				break;
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
	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var tabList = document.getElementsByClassName('tabButton');

	if (dragTarget.id === event.target.id){
		return;
	}

	if (dragTarget === event.target.nextSibling){
		groupBox.insertBefore(dragTarget, event.target);
	} else {
		groupBox.insertBefore(dragTarget, event.target.nextSibling);
	}

	var addButton = document.getElementById('addButton');
	var expandToggle = document.getElementById('expandToggle');

	if (addButton !== null)
		groupBox.removeChild(addButton);
	if (expandToggle !== null)
		groupBox.removeChild(expandToggle);

	var clears = groupBox.getElementsByClassName('clear');
	while(clears.length > 0){
		groupBox.removeChild(clears[0]);
	}

	var rowCount = 0;
	var element = groupBox.lastChild;
	while (element.previousSibling){
		if (element.className === 'tabButton'){
			rowCount++;
		}

		if (rowCount === rowLength){
			var clear = document.createElement('div');
			clear.className = 'clear';
			groupBox.insertBefore(clear, element);
			rowCount = 0;
		}
		
		element = element.previousSibling;
	} 
}

function saveNewGroupOrder(target){
	var groupBox = document.getElementById('groupBox');
	var rowCount = groupBox.getElementsByClassName('clear').length;
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var tabList = document.getElementsByClassName('tabButton');

	chrome.storage.local.get(null, function(data){
		var newGroupOrder = []; 
		var topRowLength = rowLength - (rowCount * rowLength - tabList.length)

		for (var i = rowCount - 1; i > 0; i--){
			var startIndex = topRowLength + (i - 1) * rowLength;
			var lastIndex = startIndex + rowLength - 1;

			for (var j = startIndex; j <= lastIndex; j++){
				var group = getGroup(data, tabList[j]);
				if (target.id === group.id){
					data.activeIndex = newGroupOrder.length
				}
				newGroupOrder.push(group);
			}
		}

		for (var i = 0; i < topRowLength; i++){
			var group = getGroup(data, tabList[i]);
			if (target.id === group.id){
				data.activeIndex = newGroupOrder.length
			}
			newGroupOrder.push(group);
		}

		data.groups = newGroupOrder;
		chrome.storage.local.set(data, function(){
			chrome.runtime.sendMessage({save: 'save'});
		});
	});
}

function getGroup(data, tab){
	var title = tab.getElementsByClassName('tabTitle')[0].innerHTML;

	for (var i = 0; i < data.groups.length; i++){
		if (data.groups[i].name === title){
			return data.groups[i];
		}
	}
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
		if (target === objs[i]){
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
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
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

