/**************************************************************************
 * menu.js
 *
 * This handles the options in the menu of Viz-Tab. Sends messages to
 * background.js for undo and redo. It also creates the help page.
 *
/**************************************************************************/


function undo() {
	chrome.runtime.sendMessage({undo: 'undo'});
}

function redo() {
	chrome.runtime.sendMessage({redo: 'redo'});
}

function help() {
	var pageList = [
			{'scroll': 0, 'title': 'Google', 'url': 'https://www.google.com', 'img': '/images/google.jpg'},
			{'scroll': 0, 'title': 'Bing', 'url': 'https://www.bing.com', 'img': '/images/bing.jpg'}
		]
	var group1 = createDummyGroup('SearchEngines', pageList);
	var group2 = createDummyGroup('Shopping', []);
	var group3 = createDummyGroup('Work', []);
	var group4 = createDummyGroup('Fun', []);

	var groups = {
		'activeIndex': 0,
		'groupToggle': true,
		'newTab': true,
		'toggle': false,
		'groups':[group1, group2, group3, group4]
	}

	createHelpPage(groups);
}

function createDummyGroup(name, pageList){
	var group = {
		'id': '',
		'name': name,
		'pageList': pageList
	}
	return group;
}

function createHelpPage(groupList){
	var pageScreen = document.createElement('div');
	pageScreen.id = 'screen';
	redrawPage(groupList);
	document.body.insertBefore(pageScreen, document.body.firstChild);

	pageScreen.addEventListener('click', function(){
		document.body.removeChild(pageScreen);
		chrome.storage.local.get(null, function(data){
			redrawPage(data);
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
