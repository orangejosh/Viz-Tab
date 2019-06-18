

var backColor = '#FFF5D4';
var textColor = '#2F4F4F';
var blockColor = {'hex': '#a7dc83', 'r': 167, 'g': 220, 'b': 131, 'a': 0.5};

init();

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
		var resetButton = document.getElementById('resetButton');

		newTabButton.addEventListener('change', saveNewTabSetting, false);
		overrideButton.addEventListener('change', saveOverrideSetting, false);

		pickButton.addEventListener('input', loadImage, false);
		clearButton.addEventListener('click', clearBackground, false);

		backButton.addEventListener('input', function(e){getColor(e, backColor)}, false);
		backButton.addEventListener('focus', function(){saveColor(backColor);}, false);

		slider.addEventListener('input', dimBlock, false);
		slider.addEventListener('mouseup', function(e){dimBlock; chrome.storage.local.set({'blockColor': blockColor})}, false);

		blockButton.addEventListener('input', function(e){getColor(e, blockColor);}, false);
		blockButton.addEventListener('focus', function(){saveColor(blockColor);}, false);

		textButton.addEventListener('input', function(e){getColor(e, textColor);}, false);
		textButton.addEventListener('focus', function(){saveColor(textColor);}, false);

		resetButton.addEventListener('click', resetSettings, false);

		if (data.openTab)
			newTabButton.checked = true;
		if (data.newTab)
			overrideButton.checked = true;
		if (data.backgroundImg !== undefined && data.backgroundImg !== null) 
			document.body.style.backgroundImage = 'url(' + data.backgroundImg + ')';
		if (data.backColor !== undefined) 
			backColor = data.backColor;
		if (data.blockColor !== undefined) 
			blockColor = data.blockColor;
		if (data.textColor !== undefined)
			textColor = data.textColor;

		document.body.style.backgroundColor = backColor;
		document.getElementById('container').style.backgroundColor = 'rgba(' + blockColor.r + ',' + blockColor.g + ',' + blockColor.b + ',' + blockColor.a + ')';
		document.getElementById('container').style.color = textColor; 

		backButton.value = backColor;
		blockButton.value = blockColor.hex;
		slider.value = blockColor.a * 100;
		textButton.value = textColor;

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
	document.getElementById('container').style.backgroundColor = 'rgba(' + blockColor.r + ',' + blockColor.g + ',' + blockColor.b + ',' + blockColor.a + ')';
}

function getColor(e, color) {
	if (color == blockColor){
		var c = '0x' + e.target.value.slice(1);
		color.r = c >> 16 & 255;
		color.g = c >> 8 & 255;
		color.b = c & 255;

		var style = 'rgba(' + blockColor.r + ',' + blockColor.g + ',' + blockColor.b + ',' + blockColor.a + ')';
		document.getElementById('container').style.backgroundColor = style; 
	} else if (color == backColor){
		document.body.style.backgroundColor = e.target.value;
		backColor = e.target.value;
	} else if (color == textColor){
		document.getElementById('container').style.color = e.target.value; 
		textColor = e.target.value;
	}
}

function saveColor(color) {
	chrome.storage.local.get(null, (data) => {
		if (color == blockColor){
			var style = 'rgba(' + blockColor.r + ',' + blockColor.g + ',' + blockColor.b + ',' + blockColor.a + ')';
			document.getElementById('container').style.backgroundColor = style; 
			data.blockColor = blockColor;
		} else if (color == backColor){
			document.body.style.backgroundColor = backColor;
			data.backColor = backColor;
		} else if (color === textColor){
			document.body.style.color = textColor;
			data.textColor = textColor;
		}
		chrome.storage.local.set(data);
	});
}

function resetSettings(){
	chrome.storage.local.remove([
		'backColor', 
		'backgroundImg', 
		'blockColor', 
		'groupToggle', 
		'newTab', 
		'openTab', 
		'textColor', 
		'toggle'
	], function() {
		location.reload();	
	});
}

function printColor(hex){
	var c = '0x' + hex.slice(1);
	console.log(c >> 16 & 255);
	console.log(c >> 8 & 255);
	console.log(c & 255);
}
