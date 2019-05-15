
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

	chrome.storage.local.get('newTab', function(data){
		var newTabOn = data.newTab === undefined || data.newTab === false ? false : true;
		var newTab = document.getElementById('newTab');
		newTab.checked = newTabOn;			
	})
}

function addListeners(){
	var save = document.getElementById("saveButton");
	var groupList = document.getElementById('groupList');
	var groupName = document.getElementById('groupName');
	var toggle = document.getElementById('tabSwitch');
	var open = document.getElementById('openButton');
	var newTab = document.getElementById('newTab');

	save.addEventListener('click', saveTabs, false);
	groupList.addEventListener('change', checkForGroupList, false);
	groupName.addEventListener('keypress', checkKeyPress, false);
	toggle.addEventListener('change', toggleSwitch, false);
	open.addEventListener('click', openNewTab, false);
	newTab.addEventListener('change', toggleNewTab, false);
}

function createGroupList(){
	chrome.storage.local.get(null, function(data){
		var d = new Date();
		var date = d.toLocaleDateString();

		var option = document.createElement('option');
		option.value = checkSameName(date, data.groups);
		option.text = 'New Group';

		var grpButton = document.getElementById('groupList');
		grpButton.appendChild(option);

		if (data.groups === undefined || data.groups.length === 0){
			var groupList = document.getElementById('groupList');
			groupList.style.display = 'none';

			var box = document.getElementById('groupName')
			box.style.display = 'block';

			return;
		}			

		for (var i = 0; i < data.groups.length; i++){
			var aGroup = data.groups[i];
			var option = document.createElement('option');
			option.value = aGroup.name;
			option.text = aGroup.name;

			grpButton.appendChild(option);
		}

		if (data.activeIndex !== undefined){
			grpButton.selectedIndex = data.activeIndex + 1;
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

function toggleNewTab(){
	var box = document.getElementById('newTab');
	if (box.checked) {
		chrome.storage.local.set({'newTab': true});
	} else {
		chrome.storage.local.set({'newTab': false});
	}
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
		chrome.runtime.sendMessage({allPages: name});
	} else {
		chrome.runtime.sendMessage({onePage: name});
	}
	window.close();
}





