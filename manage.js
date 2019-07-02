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


