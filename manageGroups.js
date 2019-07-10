

function switchGroup(id){
	chrome.storage.local.get(null, function(data){
		for (var i = 0; i < data.groups.length; i++){
			if (data.groups[i].id === id){
				if (data.activeIndex === i){
					return;
				} else {
					data.activeIndex = i;
					break;
				}
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


/**************************************************************
 * Begin: Reorder Groups
 **************************************************************/
function moveGroup(event){
	if (dragTarget.id === event.target.id) return;

	var groupBox = document.getElementById('groupBox');
	var element = groupBox.firstChild;
	var sameRow = true;
	var firstElem;

	while (element.nextSibling){
		var targetElement = element.id === dragTarget.id || element.id === event.target.id;

		if (firstElem === undefined && targetElement){
			firstElem = element;
		} else if (targetElement){
			break;
		} else if (firstElem !== undefined && element.className === 'clear'){
			sameRow = false;
			break;
		}
		element = element.nextSibling;
	}

	var overRowTop = firstElem === event.target;

	if ((sameRow && overRowTop) || (!sameRow && !overRowTop)){
		groupBox.insertBefore(dragTarget, event.target);
	} else {
		groupBox.insertBefore(dragTarget, event.target.nextSibling);
	}

	if (!sameRow){
		orderRows(groupBox, overRowTop);
	}
}

function orderRows(groupBox, overRowTop){
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var element = groupBox.lastChild;
	var rowTail;
	var count = 0;

	while (element.previousSibling){
		if (element.className === 'tabButton'){
			if (count === 0) rowTail = element;
			count++;
		} else if (count > 0 && count < rowLength) {
			pullNextRow(groupBox, element, rowTail);
			count = 0;
		} else if (count > 0 && count > rowLength){
			pushNextRow(groupBox, rowTail, element);
			count = 0;
		} else {
			count = 0;
		}
		element = element.previousSibling;
	}
}

function pullNextRow(groupBox, pullElement, rowTail){
	while (pullElement.className !== 'tabButton'){
		pullElement = pullElement.previousSibling;
	}
	while (pullElement.className === 'tabButton' && pullElement.previousSibling){
		pullElement = pullElement.previousSibling;
	}
	if (pullElement.previousSibling){
		pullElement = pullElement.nextSibling;
	}
	groupBox.removeChild(pullElement);
	groupBox.insertBefore(pullElement, rowTail.nextSibling);

}

function pushNextRow(groupBox, pullElement, rowHead){
	while (rowHead.className !== 'tabButton' && rowHead.previousSibling){
		rowHead = rowHead.previousSibling;
	}
	while (rowHead.className === 'tabButton' && rowHead.previousSibling){
		rowHead = rowHead.previousSibling;
	}

	if (rowHead.previousSibling){
		rowHead = rowHead.nextSibling;
	}
	groupBox.removeChild(pullElement);
	groupBox.insertBefore(pullElement, rowHead);
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
/**************************************************************
 * End: Reorder Groups
 **************************************************************/


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

/*
 * If there are many rows of groups they can be collapsed so as to take less space.
 */
function toggleGroupRows() {
	var groupBox = document.getElementById('groupBox');
	var pageBox = document.getElementById('pageBox');
	var toggle = document.getElementById('expandToggle');
	var toggleInput = document.getElementById('groupSwitch');
	var tabs = document.getElementsByClassName('tabButton');
	var addButton = document.getElementById('addButton');

	if (toggle === null){
		return;
	} else if (toggleInput.checked){
		toggle.style.background = 'url("images/downArrow.png") no-repeat';
		addButton.style.display = 'initial';
		groupBox.style.top = 0;
		pageBox.style.top = 0;

		for (var i = 0; i < tabs.length; i++){
			tabs[i].style.top = 0;
			for (var j = 0; j < tabs[i].children.length; j++){
				tabs[i].children[j].hidden = false;
			}
		}
		chrome.storage.local.set({'groupToggle': true});
	} else {
		toggle.style.background = 'url("images/upArrow.png") no-repeat';
		addButton.style.display = 'none';

		var element = groupBox.lastChild;
		var clearCount = 0;
		var firstRow = true;
		while (element.previousSibling){
			element = element.previousSibling;
			if (element.className === 'clear'){
				clearCount++;
			}
			if (clearCount > 0 && element.className === 'tabButton'){
				element.style.top = clearCount * 20;
				var children = element.children;
				for (var j = 0; j < children.length; j++){
					if (!children[j].classList.contains('tabImage')){
						children[j].hidden = true;
					}
				}
			}
		}
		groupBox.style.top = clearCount * 20 * -1;
		pageBox.style.top = clearCount * 20 * -1;
		chrome.storage.local.set({'groupToggle': false});
	}
	toggle.style.backgroundSize = '100% auto';	
}
