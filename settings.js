

var blockColor = createColor('#ffffff');
var backColor = '#ffffff';
var textColor = '#ffffff';

document.onload = init();

function init(){
	chrome.storage.local.get(null, function(data){
		var newTabButton = document.getElementById("newTab");
		var overrideButton = document.getElementById("overrideTab");
		var pickButton = document.getElementById("file-input");
		var clearButton = document.getElementById("clear");
		var backButton = document.getElementById("backColor");
		var blockButton = document.getElementById("blockColor");
		var slider = document.getElementById("slider");
		var textButton = document.getElementById("textColor");

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);
		pickButton.addEventListener('input', loadImage, false);
		clearButton.addEventListener('click', clearBackground, false);

		slider.addEventListener('input', dimBlock, false);
		slider.addEventListener('mouseup', function(){chrome.storage.local.set({'blockColor': blockColor})}, false);

		backButton.addEventListener('input', function(e){getColor(e, 'back')}, false);
		backButton.addEventListener('focus', function(){setColor('back');}, false);

		blockButton.addEventListener('input', function(e){getColor(e, 'block');}, false);
		blockButton.addEventListener('focus', function(){setColor('block');}, false);

		textButton.addEventListener('input', function(e){getColor(e, 'text');}, false);
		textButton.addEventListener('focus', function(){setColor('text');}, false);

		if (data.openTab){
			newTabButton.checked = true;
		}
		if (data.newTab){
			overrideButton.checked = true;
		}
		if (data.backgroundImg !== undefined && data.backgroundImg !== null) {
			document.body.style.backgroundImage = 'url(' + data.backgroundImg + ')';
		}
		if (data.backColor !== undefined) {
			backColor = data.backColor;
			document.body.style.backgroundColor = backColor;
			backButton.value = backColor;
		}
		if (data.blockColor !== undefined) {
			blockColor = data.blockColor;
			document.getElementById('container').style.backgroundColor = 'rgba(' + blockColor.r + ',' + blockColor.b + ',' + blockColor.g + ',' + blockColor.a + ')';
			blockButton.value = data.blockColor.hex;
			slider.value = data.blockColor.a * 100;
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

function dimBlock(e){
	blockColor.a = e.target.value / 100;
	document.getElementById('container').style.backgroundColor = 'rgba(' + blockColor.r + ',' + blockColor.b + ',' + blockColor.g + ',' + blockColor.a + ')';
}

function getColor(e, color) {
	if (color === 'block'){
		blockColor = createColor(e.target.value, blockColor);
		var style = 'rgba(' + blockColor.r + ',' + blockColor.b + ',' + blockColor.g + ',' + blockColor.a + ')';
		document.getElementById('container').style.backgroundColor = style; 
	} else if (color === 'back'){
		document.body.style.backgroundColor = e.target.value;
		backColor = e.target.value;
	} else if (color === 'text'){
		document.body.style.color = e.target.value;
		textColor = e.target.value;
	}
}

function setColor(color) {
	chrome.storage.local.get(null, (data) => {
		if (color === 'block'){
			document.getElementById('container').style.backgroundColor = blockColor;
			data.blockColor = blockColor;
		} else if (color === 'back'){
			document.body.style.backgroundColor = backColor;
			data.backColor = backColor;
		} else if (color === 'text'){
			document.body.style.color = textColor;
			data.textColor = textColor;
		}
		chrome.storage.local.set(data);
	});
}


function createColor(hex, color){
	if (color === undefined){
		color = {'hex': hex};
	} else {
		color.hex = hex;
	}
	var c = '0x' + hex.slice(1);
	color.r = c >> 16 & 255;
	color.b = c >> 8 & 255;
	color.g = c & 255;

	return color;
}
