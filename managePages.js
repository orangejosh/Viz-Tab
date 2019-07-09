
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

