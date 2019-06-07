
var backColor;
var blockColor;
var textColor;

document.onload = init();

function init(){
	chrome.storage.local.get(null, function(data){
		var newTabButton = document.getElementById("newTab");
		var overrideButton = document.getElementById("overrideTab");
		var pickButton = document.getElementById("file-input");
		var clearButton = document.getElementById("clear");
		var backButton = document.getElementById("backColor");
		var blockButton = document.getElementById("blockColor");
		var textButton = document.getElementById("textColor");

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);
		pickButton.addEventListener('input', loadImage, false);
		clearButton.addEventListener('click', clearBackground, false);

		backButton.addEventListener('input', function(e){backColor = e.target.value;}, false);
		backButton.addEventListener('focus', function(){setColor(backColor);}, false);

		blockButton.addEventListener('input', function(e){blockColor = e.target.value;}, false);
		blockButton.addEventListener('focus', function(){setColor(blockColor);}, false);

		textButton.addEventListener('input', function(e){textColor = e.target.value;}, false);
		textButton.addEventListener('focus', function(){setColor(textColor);}, false);

		if (data.openTab === undefined){
			data.openTab = false;
		}
		if (data.newTab === undefined) {
			data.newTab = false;
		}
		if (data.openTab){
			newTabButton.checked = true;
		}
		if (data.newTab){
			overrideButton.checked = true;
		}
		if (data.backgroundImg !== undefined) {
			document.body.style.backgroundImage = 'url(' + data.backgroundImg + ')';
		}
		if (data.backColor !== undefined) {
			document.body.style.backgroundColor = data.backColor;
			backColor = data.backColor;
			backButton.value = data.backColor;
		}
		if (data.blockColor !== undefined) {
			document.getElementById('container').style.backgroundColor = data.blockColor;
			blockColor = data.blockColor;
			blockButton.value = data.blockColor;
		}
		if (data.textColor !== undefined){
			document.body.style.color = data.textColor;
			textColor = data.textColor;
			textButton.value = data.textColor;
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

function setColor(color) {
	chrome.storage.local.get(null, (data) => {
		console.log(color);
		console.log(blockColor);
		console.log(' ');
		if (color == blockColor){
			document.getElementById('container').style.backgroundColor = color;
			data.blockColor = color;
		} else if (color == backColor){
			document.body.style.backgroundColor = color;
			data.backColor = color;
		} else if (color == textColor){
			document.body.style.color = color;
			data.textColor = color;
		}
		chrome.storage.local.set(data);
	});
}
