

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse){
	console.log(request);
	if (request.page === 'getScroll'){
		var pageScroll = document.documentElement.scrollTop.toString();
		sendResponse({scroll: pageScroll});
	} else if (request.scroll !== undefined){
		// TODO can't get this to work
		window.scrollTo(0, request.scroll);
	}
})


