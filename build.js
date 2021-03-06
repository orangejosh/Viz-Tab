/**************************************************************************
 * build.js
 *
 * This runs when a Viz-Tab tab is opened. It retrieves
 * the saved groups and pages from chrome storage. It then 
 * builds a webpage from that saved data. 
 *
/**************************************************************************/


window.onload = init();

function init() {
	// Builds the page
	chrome.storage.local.get(null, function (data){
		if (data.groups === undefined){
			data.groups = [];
		}
		buildMenu();
		buildGroups(data);
		buildPages(data);
	});

	// Listens for the arrow key presses that navigate groups
	document.body.addEventListener('keydown', function(e){
		var key = e.which || e.keyCode;
		if (key >= 37 && key <= 40){
			keyPress(key);
		}
	});

	// DEBUGGING BUTTON: Displays the saved data from chrome storage
	var button = document.createElement('button');
	button.addEventListener('click', function(){
		chrome.storage.local.get(null, function(data){
			console.log(data);
		})
	})
	document.body.appendChild(button);
}


function buildMenu(){
	var menuButton = document.getElementById('menuButton');
	menuButton.addEventListener('click', toggleMenu);

	var undoButton = document.getElementById('undo');
	undoButton.addEventListener('click', undo);

	var redoButton = document.getElementById('redo');
	redoButton.addEventListener('click', redo);

	var settingButton = document.getElementById('settings');
	settingButton.addEventListener('click', settings);

	var helpButton = document.getElementById('help');
	helpButton.addEventListener('click', help);

	var donateButton = document.getElementById('donateButton');
	donateButton.addEventListener('click', openDonatePage);
}




/**************Build Groups Start ******************
 *
 * Saved pages are organized in groups, with each group getting its
 * own tab to display all the pages.
 *
/***************************************************/

/*
 * Builds a tab for each group saved (a default tab if none are saved)
 * and then organizes them on the page.
 */
function buildGroups(data){
	if (data.groups === undefined || data.groups.length === 0){
		buildEmptyGroup();
		return;
	}

	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var rows = Math.ceil(data.groups.length / rowLength);

	for (var i = rows - 1; i >= 0; i--){
		var firstIndex = rowLength * i;
		var lastIndex = data.groups.length - 1;
		if (lastIndex > firstIndex + rowLength - 1){
			lastIndex = firstIndex + rowLength - 1;
		}

		for (var j = firstIndex; j <= lastIndex; j++){
			var group = data.groups[j];
			var isActive = data.activeIndex === j;
			
			var tab = createTab(group, isActive, data.textColor);
			isActive = data.activeIndex == j && (data.groupToggle || i == 0);

			var tabImage = createTabImage(group, isActive);
			var title = createTabTitle(group, isActive);
			var input = createTabInput(group);
			var closeButton = createTabClose(group);

			tab.appendChild(tabImage);
			tab.appendChild(title);
			tab.appendChild(closeButton);
			tab.appendChild(input);

			groupBox.appendChild(tab);

			tab.style.zIndex = rows - i;
		}

		if (i == rows - 1){
			var addButton = createAddTabButton();
			groupBox.appendChild(addButton);
		}

		if (i > 0) {
			var clear = document.createElement('div');
			clear.className = 'clear';
			groupBox.appendChild(clear);
		}
	}

	if (rows > 1){
		createTabExpandButton();
	}
	var clear = document.createElement('div');
	clear.className = 'clear';
	groupBox.appendChild(clear);

}

function createAddTabButton(){
	var addButton= document.createElement('img');
	addButton.id = 'addButton';
	addButton.draggable = false;
	addButton.src = 'images/addButton.png';
	addButton.addEventListener('click', function(){
		addNewGroup();
	});
	return addButton;
}

/*
 * Creates an html tab for the group and adds the appropriate
 * listeners to drag, reorder, etc.
 */
function createTab(group, active, color){
	var tab = document.createElement('div');
	tab.className = 'tabButton';
	tab.id = group.id;
	tab.draggable = true;

	addTabListeners(tab);

	if (active){
		var trap1 = document.createElement('div');
		trap1.className = 'trapLn1';
		trap1.style.background = color;
		var trap2 = document.createElement('div');
		trap2.className = 'trapLn2';
		trap2.style.background = color;
		var trap3 = document.createElement('div');
		trap3.className = 'trapLn3';
		trap3.style.background = color;

		tab.appendChild(trap1);
		trap1.appendChild(trap2);
		trap1.appendChild(trap3);
	} else {
//		tab.style.top = '2px';
	}

	return tab;	
}

/**
 * Adds listners to tabs to handle drag/drop, click etc.
 */
function addTabListeners(tab){
	tab.addEventListener('dragstart', function(event){
		dragTarget = tab;
		startDragBlock(event.target);
	})
	tab.addEventListener('dragenter', function(event){
		if (dragTarget.className === 'tabButton' && event.target.className === 'tabButton'){
			moveGroup(event);
		} else if (dragTarget.className === 'pageBlock' && event.target.className === 'tabButton'){
			var tabImg = event.target.getElementsByClassName('tabImage')[0];
			tabImg.src = 'images/tabOver.png';
		}
	});
	
	tab.addEventListener('dragleave', function(event){
		if (dragTarget.className === 'pageBlock' && event.target.className === 'tabButton'){
			var tabImg = event.target.getElementsByClassName('tabImage')[0];
			//Need to check if the tab is active before deciding which image
			tabImg.src = 'images/tabOff.png';
		}
	});

	tab.addEventListener('dragend', function(event){
		stopDragBlock();
	});

	tab.addEventListener('dragover', function(event){
		event.preventDefault();
	})

	tab.addEventListener('drop', function(event){
		if (dragTarget.className === 'pageBlock' && event.target.className === 'tabButton'){
			var tabImg = event.target.getElementsByClassName('tabImage')[0];
			tabImg.src = 'images/tabOn.png';
			reGroupPage(dragTarget, event.target);
		} else if (dragTarget.className === 'tabButton' && event.target.className === 'tabButton'){
	 		saveNewGroupOrder(dragTarget);
		}
	})
}

/*
 * Creates the image for the groups tab
 */
function createTabImage(group, active){
	var tabImage = document.createElement('img');
	tabImage.className = 'tabImage dragBlock';
	tabImage.draggable = false;
	tabImage.src = active ? 'images/tabOn.png' : 'images/tabOff.png';
	tabImage.addEventListener('click', function(){
		switchGroup(group.id);
	});
	tabImage.addEventListener('dblclick', function(){
		renameGroup(group.name);
	});

	return tabImage;
}

/*
 * Creates the title for the groups tab
 */
function createTabTitle(group, active){
	var title = document.createElement('p');
	title.className = 'tabTitle';
	title.draggable = false;
	title.style.color = active ? 'black' : 'grey';	
	var node = document.createTextNode(group.name);
	title.appendChild(node);

	return title;
}

/*
 * Creates the input box in the tab to input a new title for the group
 */
function createTabInput(group){
	var input = document.createElement('input');
	input.className = 'tabTitleInput';
	input.draggable = false;
	input.placeholder = 'New Group Name';
	input.addEventListener('keydown', function(e){
		var key = e.which || e.keyCode;
		if (key === 13){
			if (input.value.length != 0){
				saveGroupName(input.value);
			}
			input.value = '';
			input.style.visibility = 'hidden';
		} else if (key === 27){
			input.value = '';
			input.style.visibility = 'hidden';
		}
	})
	input.addEventListener('focusout', function(){
		input.style.visibility = 'hidden';
		if (input.value.length != 0){
			saveGroupName(input.value);
		}
	})
	return input;	
}

/*
 * Creates a close button to delete the group
 */
function createTabClose(group){
	var closeButton = document.createElement('img');
	closeButton.className = 'closeGroupButton dragBlock';
	closeButton.draggable = false;
	closeButton.src = 'images/closeButton.png';
	closeButton.addEventListener('click', function(){
		closeGroup(group.name);
	});

	return closeButton;
}

/*
 * If there are muliple lines of groups a button is created
 * that will collapse them so they don't take up too much space
 */
function createTabExpandButton(){
	var expandSwitch = document.createElement('input');
	expandSwitch.id = 'groupSwitch';
	expandSwitch.type = 'checkbox';

	var expandLabel = document.createElement('label');
	expandLabel.setAttribute('for', 'groupSwitch');
	expandLabel.appendChild(expandSwitch);

	var toggle = document.createElement('div');
	toggle.id = 'expandToggle';
	toggle.title = 'Expand Groups';
	toggle.appendChild(expandLabel);

	var groupBox = document.getElementById('groupBox');
	groupBox.appendChild(toggle);

	toggle.addEventListener('change', toggleGroupRows);
	chrome.storage.local.get('groupToggle', function(toggle){
		expandSwitch.checked = toggle.groupToggle === undefined ? true : toggle.groupToggle;
		toggleGroupRows();
	})	
}

/**************Build Tabs End ******************/






/**************Build Pages Start ******************
 *
 * Builds the thumbnails, titles, and icons for each page saved
 * in the active group.
 *
/***********************************************

/*
 * Builds the page data of the active group
 */
function buildPages(data){
	var activeGroup = data.groups[data.activeIndex];
	if (activeGroup === undefined){
		return;
	}

	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
	var rows = Math.ceil(data.groups.length / rowLength);

	var pageBox = document.getElementById('pageBox');
	if (data.blockColor !== undefined){
		var color = 'rgba(' + data.blockColor.r + ',' + data.blockColor.g + ',' + data.blockColor.b + ',' + data.blockColor.a + ')';
		pageBox.style.backgroundColor = color;
	}

	if (activeGroup.pageList.length > 0){
		pageBox.style.removeProperty('height');
		createOpenAllButton(rows > 1);
	} else {
		pageBox.style.height = '164px';
		var openAllButton = document.getElementById('openAll');
		if (openAllButton !== null){
			openAllButton.style.visibility = 'none';
		}
	}

	if (data.blockColor != undefined){
		pageBox.style.backgroundColor = data.blockColor;
	}
	if (data.backColor != undefined){
		document.body.style.backgroundColor = data.backColor;
	}
	if (data.backgroundImg != undefined){
		document.body.style.backgroundImage = 'url(' + data.backgroundImg + ')';
	}
	if (data.textColor != undefined){
		pageBox.style.borderColor = data.textColor;
	}

	createPages(activeGroup, data);

	if (data.textColor != undefined){
		document.getElementById('menuButton').style.color = data.textColor;
		document.getElementById('undo').style.color = data.textColor;
		document.getElementById('redo').style.color = data.textColor;
		document.getElementById('settings').style.color = data.textColor;
		document.getElementById('help').style.color = data.textColor;
		document.getElementById('donateButton').style.color = data.textColor;
		
		var pages = document.getElementsByClassName("pageLink");
		for (var i = 0; i < pages.length; i++){
			pages[i].style.color = data.textColor;
		}
	}
}

/*
 * Creates and displays all the pages saved in the active group
 */
function createPages(activeGroup, data){
	var pageList = activeGroup.pageList;

	for (var i = 0; i < pageList.length; i++){
		var page = pageList[i];
		var url = page.url;
		var img = page.img

		var box = document.getElementById('pageBox');
		var block = createPageBlock();
		var preview = createPreview(page, block, img);
		var pageTitle = createPageTitle(block, page.title, page.url);
		var input = createPageInput(page.url, pageTitle);

		var closeButton = document.createElement('button');
		closeButton.className = 'closeButton dragBlock';
		closeButton.value = 'Close';
		closeButton.id = page.url;
		closeButton.draggable = false;

		closeButton.addEventListener('click', function(){
			closePage(this.id);
		});

		var favicon = document.createElement('img');
		favicon.className = 'favicon dragBlock';
		favicon.src = 'http://www.google.com/s2/favicons?domain_url=' + page.url;
		favicon.draggable = false;

		block.appendChild(closeButton);
		block.appendChild(preview);
		block.appendChild(favicon);
		block.appendChild(pageTitle);
		block.appendChild(input);
		box.appendChild(block);
	}	
}

/*
 * Creates an html block to hold the thumbnail, and title.
 * Adds the appropriate dataeners to enable dragging and reordering.
 */
function createPageBlock(){
	var block = document.createElement('div');
	block.className = 'pageBlock';
	block.draggable = true;

	block.addEventListener('dragstart', function(event){
		startDragBlock(event.target);
		dragTarget = block;
	})
	block.addEventListener('dragover', function(event){
		event.preventDefault();
	})
	block.addEventListener('dragenter', function(event){	
		if (dragTarget.className === 'pageBlock' 
			&& event.target.className === 'pageBlock'
			&& !dragTarget.contains(event.target)
			&& dragTarget != event.target){
			reOrderPages(event);
		}
	});
	block.addEventListener('dragend', function(event){
		stopDragBlock();
	})
	block.addEventListener('drop', function(event){
		if (dragTarget.className === 'pageBlock' 
			&& event.target.className === 'pageBlock'){
			saveNewPageOrder();
		}
	})

	return block;
}

/*
 * Creates a thumbnail of the page to display
 */
function createPreview(page, block, img){
	var image = document.createElement('img');
	image.src = img;
	image.className = 'dragBlock preview';
	image.draggable = false;
	image.ondrop = false;
	setImageDims(image, block);

	var link = document.createElement('a');
	link.href = '#';
	link.id = page.url;
	link.appendChild(image);
	link.draggable = false;
	link.addEventListener('click', function(){
		chrome.storage.local.get(null, function(data){
			if (data.openTab){
				chrome.tabs.create({url: page.url, active: false}, function(tab){
					// TODO Get this to work.
					//chrome.runtime.sendMessage({scroll: tab.id + " " + page.scroll});
				});
			} else {
				window.open(page.url, "_self");
			}
		})

	});

	return link;
}

/*
 * Creates a title for the page
 */
function createPageTitle(column, title, url){
	var pageTitle = document.createElement('p');
	pageTitle.className = 'pageLink dragBlock';
	var node = document.createTextNode(title);
	pageTitle.appendChild(node);
	pageTitle.addEventListener('dblclick', function(){
		var theInput = column.getElementsByClassName('pageTitleInput')[0];
		theInput.style.visibility = 'visible';
		theInput.focus();
	});

	return pageTitle;
}

/*
 * Creates an input box to change the title of the page
 */
function createPageInput(url, pageTitle){
	var input = document.createElement('input');
	input.className = 'pageTitleInput';
	input.placeholder = 'New Page Name';
	input.addEventListener('keydown', function(e){
		var key = e.which || e.keyCode;
		if (key === 13){
			if (input.value.length != 0){
				savePageName(input.value, url);
			}
			input.value = '';
			input.style.visibility = 'hidden';
			pageTitle.style.visibility = 'visible';
		} else if (key === 27){
			input.value = '';
			input.style.visibility = 'hidden';
			pageTitle.style.visibility = 'visible';
		}
	})
	input.addEventListener('focusout', function(){
		input.style.visibility = 'hidden';
		if (input.value.length != 0){
			savePageName(input.value, url);
		}
	})
	return input;
}

/*
 * Sets the dimensions of the image thumbnail
 */
function setImageDims(image, preview) {
	var i = new Image();
	i.src = image.src;
	i.onload = function(){
		image.style.width = '100%';
	}
}

/*
 * Creates a button to open every page in the group
 */
function createOpenAllButton(expand){
	var button = document.createElement('img');
	button.src = 'images/expand.png';

	var link = document.createElement('a');
	link.id = 'openAll';
	/*
	if (expand === false){
		link.style.top = '-23px';
	}
	*/
	link.title = 'Open All Pages';
	link.appendChild(button);

	var groupBox = document.getElementById('pageBox');
	groupBox.appendChild(link);

	link.addEventListener('click', openAllPages)
}


/**************Build Pages End ******************/


/*
 * Changes the active group depending on what arrow key is pressed
 */
function keyPress(key){
	chrome.storage.local.get(null, function(data){
		var rowLength = Math.floor((groupBox.offsetWidth - GROUPMARGIN) / TABWIDTH);
		if (key === 39){
			data.activeIndex++;
		} else if (key === 37){
			data.activeIndex--;
		} else if (key === 38){
			data.activeIndex = data.activeIndex + rowLength;
		} else if (key === 40) {
			data.activeIndex = data.activeIndex - rowLength;
		}

		if (data.activeIndex > data.groups.length - 1 || data.activeIndex < 0){
			return;
		}
		var tabs = document.getElementsByClassName('tabButton');
		for (i in tabs){
			if (data.groups[data.activeIndex].id === tabs[i].id){
				switchGroup(tabs[i].id);
				break;
			}
		}
		chrome.storage.local.set(data);
	});
}

/*
 * Works with buildInstructions() to create an empty group
 * Gets called when there are no groups saved
 */
function buildEmptyGroup(){
	var pageBox = document.getElementById('pageBox');

	var note = document.createTextNode("You don't seem to have any tabs saved.");
	var header = document.createElement('h2');
	header.appendChild(note);

	var div1 = buildInstructions('images/address.png', '1. Open your favorite webpage in a new tab.');
	var div2 = buildInstructions('images/TButton.png', '2. Click the MiniTab button at the top of your browser.');
	var div3 = buildInstructions('images/Menu.png', '3. Click the Save button and you are done.');

	var emptyDiv = document.createElement('div');
	emptyDiv.id = 'emptyGroup';
	emptyDiv.appendChild(header);
	emptyDiv.appendChild(div1);
	emptyDiv.appendChild(div2);
	emptyDiv.appendChild(div3);

	pageBox.appendChild(emptyDiv);
}

function buildInstructions(imgPath, title){
	var img = document.createElement('img');
	img.src = imgPath;
	var text = document.createTextNode(title);
	var title = document.createElement('h3');
	title.appendChild(text);

	var div = document.createElement('div');
	div.className = 'openingImgs';
	div.appendChild(img);
	div.appendChild(title);

	return div;
}

