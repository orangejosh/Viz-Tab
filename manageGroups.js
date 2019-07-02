

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

	if (dragTarget.id === event.target.id){
		return;
	}

	var targetCheck = false;
	var clearCheck = false;
	var element = event.target;
	while (element.previousSibling){
		element = element.previousSibling;

		if (element.className === 'clear')
			clearCheck = true;
		if (element.id === dragTarget.id){
			if (clearCheck === false){
				break;
			}
			targetCheck = true;
		}
	}

	if (dragTarget === event.target.nextSibling || (targetCheck && clearCheck)){
		groupBox.insertBefore(dragTarget, event.target);
	} else {
		groupBox.insertBefore(dragTarget, event.target.nextSibling);
	}

	var addButton = document.getElementById('addButton');
	if (addButton)
		groupBox.removeChild(addButton);

	var expandToggle = document.getElementById('expandToggle');
	if (expandToggle)
		groupBox.removeChild(expandToggle);

	alignRows(groupBox);
	groupBox.appendChild(expandToggle);
}

function alignRows(groupBox){
	var groupNodes = groupBox.childNodes;
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var counts = getWrongRows(groupBox, rowLength);
	var total = groupBox.childElementCount;
	var over = total - counts[0];
	var under = total - counts[1];

	while (over < (under - 1)){
		var switchTab = groupNodes[over];
		while (groupNodes[over].className !== 'clear'){
			over++;
		}
		over++;
		var last = over;
		while (groupNodes[last].className !== 'clear'){
			last++;
		}
		groupBox.removeChild(switchTab);
		groupBox.insertBefore(switchTab, groupNodes[last - 1]);
		over--;
	}
	while (over > under){
		var last = over;
		while (groupNodes[last].className !== 'clear'){
			last++;
		}
		var switchTab = groupNodes[last - 1];
		over -= 2;
		while(groupNodes[over] && groupNodes[over].className !== 'clear'){
			over--;
		}
		over++;
		groupBox.insertBefore(switchTab, groupNodes[over]);
	}
}

function getWrongRows (groupBox, rowLength){
	var element = groupBox.lastChild;
	var under;
	var over;
	var i = 1;
	var count = 0;

	while (element.previousSibling){
		if (element.previousSibling.className === 'tabButton'){
			count++;
		} else if (count > 0){
			over = count > rowLength ? i : over;
			under = count < rowLength ? i : under;
			count = 0;
		} 
		element = element.previousSibling;
		i++;
	}
	if (count > 0){
		over = over === undefined ? i : over;
		under = under === undefined ? i : under;
	}
	return [over, under];
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
