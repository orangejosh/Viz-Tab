
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
		var pickButton = document.getElementById("file-input");

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);
		pickButton.addEventListener('input', loadImage, false);

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

function loadImage(e){
	var file = e.target.files[0];
	var reader = new FileReader();
	reader.readAsDataURL(file); 

	reader.onload = readerEvent => {
		var content = readerEvent.target.result;
		var options = ' no-repeat center center fixed';
		document.body.style.backgroundImage = 'url('+ content +')';
	}

}
