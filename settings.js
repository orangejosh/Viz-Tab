
document.onload = init();

function init(){
	chrome.storage.local.get(null, function(data){
		if (data.openTab === undefined){
			data.openTab = false;
		}
		if (data.newTab === undefined) {
			data.newTab = false;
		}

		var newTabButton = document.getElementById("newTab");
		var overrideButton = document.getElementById("overrideTab");

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);

		if (data.openTab){
			newTabButton.checked = true;
		}
		if (data.newTab){
			overrideButton.checked = true;
		}

		chrome.storage.local.set(data);
	})
}

function saveNewTabSetting() {
	chrome.storage.local.get(null, function(data){
		data.openTab = !data.openTab;
		chrome.storage.local.set(data);
	})
}

function saveOverrideSetting() {
	chrome.storage.local.get(null, function(data){
		data.newTab= !data.newTab;
		chrome.storage.local.set(data);
	})

}
