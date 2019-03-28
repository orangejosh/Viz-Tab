
document.onload = init();

function init() {
	chrome.storage.local.get('toggle', function(data){
		var toggle = document.getElementById('tabSwitch');
		if (data.toggle === false){
			toggle.checked = true;
			toggleSwitch();
		}
		addListeners();
		createGroupList();
	})
}

function addListeners(){
	var save = document.getElementById("saveButton");
	var groupList = document.getElementById('groupList');
	var groupName = document.getElementById('groupName');
	var toggle = document.getElementById('tabSwitch');
	var open = document.getElementById('openButton');

	save.addEventListener('click', saveTabs, false);
	groupList.addEventListener('change', checkForGroupList, false);
	groupName.addEventListener('keypress', checkKeyPress, false);
	toggle.addEventListener('change', toggleSwitch, false);
	open.addEventListener('click', openNewTab, false);
}

function createGroupList(){
	chrome.storage.local.get('groupList', function(list){
		var d = new Date();
		var date = d.toLocaleDateString();

		var option = document.createElement('option');
		option.value = checkSameName(date, list.groupList);
		option.text = 'New Group';

		var grpButton = document.getElementById('groupList');
		grpButton.appendChild(option);

		if (list.groupList === undefined || list.groupList.length === 0){
			var groupList = document.getElementById('groupList');
			groupList.style.display = 'none';

			var box = document.getElementById('groupName')
			box.style.display = 'block';

			return;
		}			

		var activeGroup;

		for (var i = 0; i < list.groupList.length; i++){
			var aGroup = list.groupList[i];

			if (aGroup.active == true){
				activeGroup = aGroup;
			}			

			var option = document.createElement('option');
			option.value = aGroup.name;
			option.text = aGroup.name;

			grpButton.appendChild(option);
		}

		if (activeGroup !== undefined){
			for (var j = 0; j < grpButton.length; j++){
				var aName = grpButton.options[j].value;
				if (aName === activeGroup.name){
					grpButton.selectedIndex = j;
					break;
				}
			}
		}
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

function clearBookmarks(){
	chrome.storage.local.clear();
}

function checkForGroupList(){
	var groupList = document.getElementById('groupList');
	var selIndex = groupList.selectedIndex;
	if (selIndex === 0){
		groupList.style.display = 'none';

		var box = document.getElementById('groupName')
		box.style.display = 'block';
	}
}

function checkKeyPress(e){
	var key = e.which || e.keyCode;
	if (key === 13){
		saveTabs();
	}
}

function toggleSwitch(){
	var toggle = document.getElementById('switch');
	var tabSwitch = document.getElementById('tabSwitch')
	if (tabSwitch.checked){
		toggle.style.background = 'url("images/switchOff.png") no-repeat';
		chrome.storage.local.set({'toggle': false});
	} else {
		toggle.style.background = 'url("images/switchOn.png") no-repeat';
		chrome.storage.local.set({'toggle': true});
	}
	toggle.style.backgroundSize = '100% auto';
}

function openNewTab() {
	window.open('newTab.html');
}

function saveTabs(){
	var entryList = document.getElementById('groupList');
	var entryNew = document.getElementById('groupName');

	if (entryList.style.display === 'none' && entryNew.value.length > 0){
		var name = entryNew.value;
	} else {
		var name = entryList.options[entryList.selectedIndex].value;
	}

	var toggle = document.getElementById('tabSwitch');
	if (toggle.checked){
		chrome.runtime.sendMessage({allPages: name}, function(response){
			window.close();
		});
	} else {
		chrome.runtime.sendMessage({onePage: name}, function(response){
			window.close();
		});
	}
}







