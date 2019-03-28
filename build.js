

var groupMargin = 70;
var tabWidth = 144;

document.onload = init();

function init() {
	document.body.addEventListener('keydown', function(e){
		var key = e.which || e.keyCode;
		if (key >= 37 && key <= 40){
			addKeyListener(key);
		}
	});

	chrome.storage.local.get('groupList', function (list){
		if (list.groupList === undefined){
			list.groupList = [];
		}
		buildMenu(list);
		buildTabs(list);
		buildPages(list);
		checkAllTabs(list);

		var button = document.createElement('button');
		button.addEventListener('click', function(){
			chrome.storage.local.get(null, function(data){
				console.log(data);
			})
		})
		document.body.appendChild(button);
	});
}

function addKeyListener(key){
	var tabs = document.getElementsByClassName('tabButton');
	for (var i = 0; i < tabs.length; i++){
		var imgPath = tabs[i].getElementsByClassName('tabImage')[0].src;
		var pathList = imgPath.split('/');
		var img = pathList[pathList.length - 1];
		if (img === 'tabOn.png'){
			var switchIndex;
			if (key === 39){
				switchIndex = i === tabs.length - 1 ? 0 : i + 1;				
			} else if (key === 37){
				switchIndex = i == 0 ? tabs.length - 1 : i - 1;	
			} else if (key === 38){
				var groupBox = document.getElementById('groupBox');
				var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
				switchIndex = i + rowLength > tabs.length - 1 ? tabs.length - 1 : i + rowLength;

			} else if (key === 40) {
				var groupBox = document.getElementById('groupBox');
				var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
				switchIndex = i - rowLength < 0 ? 0 : i - rowLength;
			}
			switchGroup(tabs[switchIndex].id);
			return;
		}
	}	
}

function buildMenu(list){
	var menuButton = document.getElementById('menuButton');
	menuButton.addEventListener('click', toggleMenu);

	var undoButton = document.getElementById('undo');
	undoButton.addEventListener('click', undo);

	var redoButton = document.getElementById('redo');
	redoButton.addEventListener('click', redo);

	var helpButton = document.getElementById('help');
	helpButton.addEventListener('click', help);

	var donateButton = document.getElementById('donateButton');
	donateButton.addEventListener('click', openDonatePage);
}


/**************Build Tabs Start ******************/

function buildTabs(list){
	if (list.groupList.length === 0){
		buildEmptyGroup();
		return;
	}

	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
	var rows = Math.ceil(list.groupList.length / rowLength);

	if (rows > 1){
		createTabExpandButton();
	}

	for (var i = 0; i < list.groupList.length; i++){
		var tabGroup = createGroupTab(list.groupList[i]);
		groupBox.appendChild(tabGroup);

		if (i % rowLength === 0){
			rows--;
		}
		tabGroup.style.top = rows * 7 - 2 + 'px';
		tabGroup.style.zIndex = rows;
	}

	var clear = document.createElement('div');
	clear.className = 'clear';
	groupBox.appendChild(clear);

}

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

function createGroupTab(group){
	var tab = createTab(group);
	var tabImage = createTabImage(group);
	var title = createTabTitle(group);
	var input = createTabInput(group);
	var closeButton = createTabClose(group);

	tab.appendChild(tabImage);
	tab.appendChild(title);
	tab.appendChild(closeButton);
	tab.appendChild(input);

	return tab;
}

function createTab(group){
	var tab = document.createElement('div');
	tab.className = 'tabButton';
	tab.id = group.id;
	tab.draggable = true;
	tab.addEventListener('dragstart', function(event){
		dragTarget = tab;
		startDragBlock(event.target);
	})
	tab.addEventListener('dragenter', function(event){
		if (dragTarget.className === 'tabButton' && event.target.className === 'tabButton'){
			reOrderGroups(event);
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
			reGroupPage(dragTarget, event.target.id);
		} else if (dragTarget.className === 'tabButton' && event.target.className === 'tabButton'){
	 		saveNewGroupOrder();
		}
	})

	return tab;	
}

function createTabImage(group){
	var tabImage = document.createElement('img');
	tabImage.className = 'tabImage dragBlock';
	tabImage.draggable = false;
	tabImage.src = group.active === true ? 'images/tabOn.png' : 'images/tabOff.png';
	tabImage.addEventListener('click', function(){
		switchGroup(group.id);
	});
	tabImage.addEventListener('dblclick', function(){
		renameGroup(group.name);
	});

	return tabImage;
}

function createTabTitle(group){
	var title = document.createElement('p');
	title.className = 'tabTitle';
	title.draggable = false;
	title.style.color = group.active === true ? 'black' : 'grey';	
	var node = document.createTextNode(group.name);
	title.appendChild(node);

	return title;
}

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

function checkAllTabs(list){
	chrome.tabs.query({currentWindow: true}, function(tabs){
		var onlyTab = true;
		for (var i = 0; i < tabs.length; i++){
			var tab = tabs[i];
			var name = tab.url.substr(0,15);
			if (name === 'chrome://newtab' && tab.active === false){
				onlyTab = false;
				break;
			}
		}
		if (onlyTab === true){
			chrome.storage.local.set({'undoObj' : {'index': 0, 'list': []}});
		}
		takeSnapShot(list);
	});
}

/**************Build Tabs End ******************/


/**************Build Pages Start ******************/

function buildPages(list, imgList){
	var activeGroup = getActiveGroup(list);
	if (activeGroup === undefined){
		return;
	}

	var groupBox = document.getElementById('groupBox');
	var rowLength = Math.floor((groupBox.offsetWidth - groupMargin) / tabWidth);
	var rows = Math.ceil(list.groupList.length / rowLength);
	var pageBox = document.getElementById('pageBox');

	if (activeGroup.pageList.length > 0){
		pageBox.style.removeProperty('height');
		createOpenAllButton(rows > 1);
	} else {
		pageBox.style.height = '400px';
		var openAllButton = document.getElementById('openAll');
		if (openAllButton !== null){
			openAllButton.style.visibility = 'none';
		}
	}

	if (imgList === undefined){
		chrome.storage.local.get(activeGroup.id, function(imageList){
			setPageData(activeGroup, imageList[activeGroup.id]);
		})
	} else {
		setPageData(activeGroup, imgList);
	}
}

function createOpenAllButton(expand){
	var button = document.createElement('img');
	button.src = 'images/expand.jpg';

	var link = document.createElement('a');
	link.id = 'openAll';
	if (expand === false){
		link.style.top = '-23px';
	}
	link.title = 'Open All Pages';
	link.appendChild(button);

	var groupBox = document.getElementById('groupBox');
	groupBox.appendChild(link);

	link.addEventListener('click', openAllPages)
}

function setPageData(activeGroup, imageList){
	var pageList = activeGroup.pageList;

	for (var i = 0; i < pageList.length; i++){
		var page = pageList[i];
		var url = page['url'];

		var img = undefined;
		for (var j = 0; j < imageList.length; j++){
			var imgGroup = imageList[j];
			if (imgGroup.url === url){
				img = imgGroup.img;
			}
		}
		createPage(page, img);
	}	
}

function createPage(page, img){
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
		closePage(closeButton.id);
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
		var scrollObj = {
			url: page.url,
			scroll: page.scroll
		}
		chrome.storage.local.set({'pages': [scrollObj]}, function (){
			window.open(page.url, "_self");
		})
	});

	return link;
}

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

/////height is causing the problem below

function setImageDims(image, preview) {
	var i = new Image();
	i.src = image.src;
	i.onload = function(){
		if (i.height / i.width > 0.52){
			image.style.width = '100%'
		} else {
			image.style.height = '100%'
			var blockWidth = preview.offsetWidth;
			var blockHeight = preview.offsetHeight;
			var ratio = blockHeight / i.height;
			var imgWidth = i.width * ratio;

			var overflow = imgWidth - blockWidth;
			image.style.marginLeft = -overflow / 2;
		}
	}
}

/**************Build Pages End ******************/



function getActiveGroup(list){
	for (var i = 0; i < list.groupList.length; i++){
		var aGroup = list.groupList[i];
		if (aGroup.active == true){
			return aGroup;
		}
	}
	setActiveGroup(list.groupList.length - 1, list);
	return list.groupList[list.groupList.length - 1];
}

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
		pageBox.style.top = (rows - 1) * -7 + 'px';
		if (openButton != null){
			openButton.style.top = (rows - 1) * 7 - 23 + 'px';
		}
		return;
	} else if (groupSwitch.checked){
		toggle.style.background = 'url("images/downArrow.jpg") no-repeat';
		pageBox.style.top = (rows - 1) * -7 + 'px';
		toggle.style.top = (rows - 1) * 7 + 'px';
		openButton.style.top = (rows - 1) * 7 - 23 + 'px';

		for (var i = 0; i < tabs.length; i++){
			if (i % rowLength === 0){
				rows--;
			}
			tabs[i].style.top = rows * 7 - 2 + 'px';
		}
		chrome.storage.local.set({'groupToggle': true});
	} else {
		toggle.style.background = 'url("images/upArrow.jpg") no-repeat';
		pageBox.style.top = (rows - 1) * -23 + 'px';
		toggle.style.top = (rows - 1) * 23 + 'px';
		openButton.style.top = (rows - 1) * 23 - 23 + 'px';

		for (var i = 0; i < tabs.length; i++){
			if (i % rowLength === 0){
				rows--;
			}
			tabs[i].style.top = rows * 23 - 2 + 'px';
		}
		chrome.storage.local.set({'groupToggle': false});
	}
	toggle.style.backgroundSize = '100% auto';	
}