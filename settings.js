
var color;
document.onload = init();

function init(){
	chrome.storage.local.get(null, function(data){
		var newTabButton = document.getElementById("newTab");
		var overrideButton = document.getElementById("overrideTab");
		var pickButton = document.getElementById("file-input");
		var clearButton = document.getElementById("clear");
		var colorButton = document.getElementById("color-picker");

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);
		pickButton.addEventListener('input', loadImage, false);
		clearButton.addEventListener('click', clearBackground, false);
		colorButton.addEventListener('input', getColor, false);
		colorButton.addEventListener('focus', setColor, false);

		if (data.openTab === undefined){
			data.openTab = false;
		}
		if (data.newTab === undefined) {
			data.newTab = false;
		}
		if (data.backgroundImg !== undefined) {
			document.body.style.backgroundImage = 'url(' + data.backgroundImg + ')';
		}
		if (data.color !== undefined) {
			document.getElementById('container').style.backgroundColor = data.color;
			color = data.color;
			colorButton.value = data.color;
		}
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
		document.body.style.backgroundImage = 'url('+ content +')';

		chrome.storage.local.get(null, (data) => {
			data.backgroundImg = content;
			chrome.storage.local.set(data);
		});
	}
}

function clearBackground() {
	chrome.storage.local.get(null, (data) => {
		data.backgroundImg = null;
		chrome.storage.local.set(data);
		document.body.style.backgroundImage = null;
	});
}



function getColor(e) {
	color = e.target.value;
}

function setColor() {
	document.getElementById('container').style.backgroundColor = color;
	chrome.storage.local.get(null, (data) => {
		data.color = color;
		chrome.storage.local.set(data);
	});
}
