

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse){
		if (request.page === 'getScroll'){
			var pageScroll = document.body.scrollTop.toString();
			sendResponse({scroll: pageScroll});
		}
	}
)

document.onload = init();

function init() {
	chrome.storage.local.get('pages', function(data){
		if (data.pages === undefined){
			return;
		}
		for (var i = 0; i < data.pages.length; i++){
			var page = data.pages[i];
			if (page.url === window.location.href){
				window.scrollTo(0, page.scroll);
			}
		}
	})
}
