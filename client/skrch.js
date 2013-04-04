var canvas, context, tool, found;

var color = [ 165, 42, 42, 255 ];

function hex2rgb(hex){
	var r = (eval("0x"+hex) & 0xff0000) >> 16;
	var g = (eval("0x"+hex) & 0x00ff00) >> 8;
	var b = eval("0x"+hex) & 0x0000ff ;
	return [r, g, b, 255];
}

var ua = navigator.userAgent.toLowerCase();
if (ua.indexOf(" chrome/") >= 0 || ua.indexOf(" firefox/") >= 0 || ua.indexOf(' gecko/') >= 0) {
	var StringMaker = function () {
			this.str = "";
			this.length = 0;
			this.append = function (s) {
				this.str += s;
				this.length += s.length;
			}
			this.prepend = function (s) {
				this.str = s + this.str;
				this.length += s.length;
			}
			this.toString = function () {
				return this.str;
			}
		}
} else {
	var StringMaker = function () {
			this.parts = [];
			this.length = 0;
			this.append = function (s) {
				this.parts.push(s);
				this.length += s.length;
			}
			this.prepend = function (s) {
				this.parts.unshift(s);
				this.length += s.length;
			}
			this.toString = function () {
				return this.parts.join('');
			}
		}
}

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com
var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function encode64(input) {
	var output = new StringMaker();
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;

	while (i < input.length) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}

		output.append(keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4));
	}

	return output.toString();
}

$.fn.disableSelection = function () {
	$(this).attr('unselectable', 'on').css('-moz-user-select', 'none').each(function () {
		this.onselectstart = function () {
			return false;
		};
	});
};

if (window.addEventListener) {
	window.addEventListener('load', function () {

		preload(['throbber.gif']);

		handleMenu();

		$.dropManage({
			mode: 'mouse'
		});
		$('#iv').disableSelection();

		function init() {
			// Find the canvas element.
			canvas = document.getElementById('iv');
			if (!canvas) {
				alert('Error: I cannot find the canvas element!');
				return;
			}

			if (!canvas.getContext) {
				alert('Error: no canvas.getContext!');
				return;
			}

			// Get the 2D canvas context.
			context = canvas.getContext('2d');
			if (!context) {
				alert('Error: failed to getContext!');
				return;
			}

			// Pencil tool instance.
			tool = new tool_pencil();

			context.strokeStyle = 'brown';

			// Attach the mousedown, mousemove and mouseup event listeners.
			canvas.addEventListener('mousedown', ev_canvas, false);
			canvas.addEventListener('mousemove', ev_canvas, false);
			canvas.addEventListener('mouseup', ev_canvas, false);
			canvas.addEventListener('mouseout', ev_canvas, false);
		}

		// The general-purpose event handler. This function just determines the mouse 
		// position relative to the canvas element.

		function ev_canvas(ev) {
			if (ev.layerX || ev.layerX == 0) { // Firefox
				ev._x = ev.layerX;
				ev._y = ev.layerY;
				if ($.browser.webkit) ev._y = ev.layerY - $(window).scrollTop();
			} else if (ev.offsetX || ev.offsetX == 0) { // Opera
				ev._x = ev.offsetX;
				ev._y = ev.offsetY;
			}

			// Call the event handler of the tool.
			var func = tool[ev.type];
			if (func) {
				func(ev);
			}
		}

		init();

	}, false);
}

// This painting tool works like a drawing pencil which tracks the mouse 
// movements.

function tool_pencil() {
	$("#iv").removeClass();
	$("#iv").addClass("pencil-ico");
	
	var tool = this;
	this.started = false;
	
	canvas.getContext('2d').strokeStyle = $('.pallette').css('background-color');

	// This is called when you start holding down the mouse button.
	// This starts the pencil drawing.
	this.mousedown = function (ev) {
		context.beginPath();
		context.moveTo(ev._x, ev._y);
		tool.started = true;
	};

	// This function is called every time you move the mouse. Obviously, it only 
	// draws if the tool.started state is set to true (when you are holding down 
	// the mouse button).
	this.mousemove = function (ev) {
		if (tool.started) {
			context.lineTo(ev._x, ev._y);
			context.lineJoin = 'round';
			context.lineWidth = 25;
			context.lineCap = 'round';
			context.stroke();
		}
	};

	// This is called when you release the mouse button.
	this.mouseup = function (ev) {
		if (tool.started) {
			tool.mousemove(ev);
			tool.started = false;
			getAlike();
		}
	};

	this.mouseout = function (ev) {
		if (tool.started) {
			tool.started = false;
			getAlike();
		}
	};
}

// The fill painting tool

function tool_fill() {
	$("#iv").removeClass();
	$("#iv").addClass("fill-ico");
	
	var tool = this;
	this.started = false;

	// This is called when you start holding down the mouse button.
	// This starts the pencil drawing.
	this.mousedown = function (ev) {
		var w = canvas.width;
		var h = canvas.height;		
		imgd = context.getImageData(0, 0, w, h);
		var mycolor = color;
		var parent = getPixel(imgd, ev._x, ev._y);
		floodFillQueue(imgd, ev._x, ev._y, parent, mycolor);
		getAlike();
	};
}

function fillPixel(imageData, x, y, color, parent) {
	if (samePixel(getPixel(imageData, x, y), parent) && !samePixel(getPixel(imageData, x, y), color)) {
		setPixel(imageData, x, y, color[0], color[1], color[2], color[3]);
		//console.log("filling pixel...");
	}
	
	fillPixel(imageData, x-1, y, color, parent);
		
	return;
}

function floodFillQueue(imageData, x, y, parent, color) {
	index = (x + y * imageData.width) * 4;
	if (samePixel(getPixel(imageData, x, y), color))
		return;
	var pixarr = new Array();
	var node = [x, y];
	pixarr.push(node);
	while (pixarr.length != 0) {
		var n = pixarr.pop();
		if (samePixel(getPixel(imageData, n[0], n[1]), parent) && !samePixel(getPixel(imageData, n[0], n[1], n[0], n[1]), color)) {
			setPixel(imageData, n[0], n[1], n[0], n[1], color[0], color[1], color[2], color[3]);
			//console.log("setting a pixel");
		}
		
		
		if (n[0] + 1 <= canvas.width) {
			var west = [n[0]+1, n[1]];
			if (samePixel(getPixel(imageData, west[0], west[1]), parent)) {
				setPixel(imageData, west[0], west[1], color[0], color[1], color[2], color[3]);
				pixarr.push(west);
			}
		}
		
		
		if (n[1] + 1 <= canvas.height) {
			var south = [n[0], n[1]+1];
			if (samePixel(getPixel(imageData, south[0], south[1]), parent)) {
				setPixel(imageData, south[0], south[1], color[0], color[1], color[2], color[3]);
				pixarr.push(south);				
			}
		}
		
		if (n[0] - 1 >= 0) {
			var east = [n[0]-1, n[1]];
			if (samePixel(getPixel(imageData, east[0], east[1]), parent)) {
				setPixel(imageData, east[0], east[1], color[0], color[1], color[2], color[3]);
				pixarr.push(east);
			}
		}
		
		
		if (n[1] - 1 >= 0) {
			var north = [n[0], n[1]-1];
			if (samePixel(getPixel(imageData, north[0], north[1]), parent)) {
				setPixel(imageData, north[0], north[1], color[0], color[1], color[2], color[3]);
				pixarr.push(north);				
			}
		}		
		
		//console.log("pixarr length = " + pixarr.length);
	}
	
	context.putImageData(imageData, 0, 0); // at coords 0,0
}

function setPixel(imageData, x, y, r, g, b, a) {
	index = (x + y * imageData.width) * 4;
	imageData.data[index+0] = r;
	imageData.data[index+1] = g;
	imageData.data[index+2] = b;
	imageData.data[index+3] = a;
}

function getPixel(imageData, x, y) {
	index = (x + y * imageData.width) * 4
	var pixelinfo = [ imageData.data[index+0], imageData.data[index+1], imageData.data[index+2], imageData.data[index+3] ];
	//console.log(pixelinfo);
	return pixelinfo;
}

function samePixel(pi0, pi1) {
	if (pi0[0] == pi1[0] && pi0[1] == pi1[1] && pi0[2] == pi1[2] && pi0[3] == pi1[3])
		return true;
	return false;
}

function clearCanvasYesNo() {
	var yn = confirm("Do you really want to clear the canvas?");
	if (yn) {
		canvas = document.getElementById('iv');
		var w = canvas.width;
		var h = canvas.height;
		context.clearRect (0, 0, w, h);
		canvas.getContext('2d').strokeStyle = 'brown';
		$('.pallette').css('background-color', 'brown');
	}
}

function canvasToImage(context, backgroundColor) {
	canvas = document.getElementById('iv');
	//cache height and width		
	var w = canvas.width;
	var h = canvas.height;

	var data;

	if (backgroundColor) {
		//get the current ImageData for the canvas.
		data = context.getImageData(0, 0, w, h);

		//store the current globalCompositeOperation
		var compositeOperation = context.globalCompositeOperation;

		//set to draw behind current content
		context.globalCompositeOperation = "destination-over";

		//set background color
		context.fillStyle = backgroundColor;

		//draw background / rect on entire canvas
		context.fillRect(0, 0, w, h);
	}

	//get the image data from the canvas
	var imageData = this.canvas.toDataURL("image/jpeg");

	if (backgroundColor) {
		//clear the canvas
		context.clearRect(0, 0, w, h);

		//restore it with original / cached ImageData
		context.putImageData(data, 0, 0);

		//reset the globalCompositeOperation to what it was
		context.globalCompositeOperation = compositeOperation;
	}

	//return the Base64 encoded data url string
	return imageData;
}

function getTransMask() {

	element = document.getElementById("iv");
	c = element.getContext("2d");
	var imgd = c.getImageData(0, 0, c.canvas.width, c.canvas.height);

	var pix = imgd.data;
	for (var i = 0, n = pix.length; i < n; i += 4) {
		if (pix[i + 3] == 0) {
			pix[i] = 0; // red
			pix[i + 1] = 0; // green
			pix[i + 2] = 0; // blue
			pix[i + 3] = 255; // alpha
		} else if (pix[i + 3] != 0) {
			pix[i] = 255; // red
			pix[i + 1] = 255; // green
			pix[i + 2] = 255; // blue
			pix[i + 3] = 255; // alpha
		}

	}
	//return imgd;
	var canvas = document.createElement("canvas");
	canvas.width = imgd.width;
	canvas.height = imgd.height;
	var ctx = canvas.getContext("2d");

	ctx.putImageData(imgd, 0, 0);

	var maskdata = canvas.toDataURL("image/jpeg");
	return maskdata;
}

// vim:set spell spl=en fo=wan1croql tw=80 ts=2 sw=2 sts=2 sta et ai cin fenc=utf-8 ff=unix:

function getAlike() {
	if( $('#copy').is(":visible") ) {
		$('#copy').hide();
	}
	
	if(!$('#morebtn').is(":visible") ) {
		$('#morebtn').fadeIn();
	}
	
	canvas = document.getElementById('iv');
	var x = canvasToImage(canvas.getContext('2d'), "white");
	x = x.substring(x.lastIndexOf(",") + 1, x.length);
	$('#base64').val(x);

	var y = getTransMask();
	y = y.substring(y.lastIndexOf(",") + 1, y.length);
	$('#base64').val(y);


	if ($.browser.msie) {
		mytest(x);
		return;
	}

	$.ajax({
		type: 'POST',
		url: 'http://68.5.135.176:8941/gimme',
		data: {
			needle: x,
			mask: y
		},
		dataType: 'text',
		beforeSend: function () {
			//$(".minmax").css({ opacity: 0.15 });
		},
		success: function (msg) {
			$('#imgs').empty();
			found = eval("(" + msg + ")");
			var c = 0;
			for (var key in found) {
				if (c == 50) break;
				if (found.hasOwnProperty(key)) {
					//alert(key + " -> " + found[key]);
					furl = found[key].substring(found[key].lastIndexOf("/") + 1, found[key].indexOf("_"));
					var newimg = $('<div class="bubbleInfo ifnd"><img src="' + found[key].replace("_z.jpg", "_m.jpg") + '" class="minmax trigger" alt="&nbsp;" onload="" title="" /><div class="popup tooltip"> \
						<div> \
						<div class="inline leftt">URL:</div> \
						<div class="inline rightt">&nbsp;<a target="_blank" href="http://flic.kr/p/' + flickr_shortUrl(furl) + '">original</a></div> \
						<br /> \
						<div class="inline leftt">&Delta;:</div> \
						<div class="inline rightt">&nbsp;' + key + '</div> \
						<div class="darrow">\
						</div></div>');
					attach_ev(newimg);
					$('#imgs').append(newimg);
					delete found[key];
					++c;
				}
				//$('#imgs').masonry({ columnWidth: 128 });
				
			}
			scrollWin();
			attachBubbles();
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			alert(XMLHttpRequest.status);
			alert(XMLHttpRequest.responseText);
			alert(textStatus);
			alert(errorThrown);
		}

	});
}


$('.pallette').click(function () {
	canvas = document.getElementById('iv');
	canvas.getContext('2d').strokeStyle = $(this).css('background-color');

});

$('#nevermind').click(function () {
	$('#uploadpopup').fadeOut();
	return false;
});

$('#morebtn').click(function (event) {
	event.preventDefault();	
	moreResults();
	return false;
});

$('#vidbtn').click(function (event) {
	$('#welcome').hide();
	$('.ivid').show();
	return false;
});


function attach_ev(element) {
	// bind a dragstart event, return the proxy element 
	$(element).bind('dragstart', function (event) {
		return $(this).clone().find(".popup").remove().end().appendTo(this.parentNode);
	});
	// bind a drag event, update proxy position
	$(element).bind('drag', function (event) {
		$(event.dragProxy).css({
			top: event.offsetY,
			left: event.offsetX
		});
	});
	// bind a dragend event, remove proxy
	$(element).bind('dragend', function (event) {
		$(event.dragProxy).fadeOut();
	});
}

$('#iv').bind("drop", function (e) {

	var ratio = $(e.dragTarget).find(">:first-child").height() / $(e.dragTarget).find(">:first-child").width();
	canvas = document.getElementById('iv');

	$('#iv').animate({
		height: $('#iv').width() * ratio
	}, {
		duration: 200,
		step: function (now, fx) {
			$(".block:gt(0)").css("left", now);
			canvas.setAttribute('height', $('#iv').width() * ratio);
		},
		complete: function () {
			rebindDrop();
			//var img = new Image();
			//img.src = 'pfs.jpg';
			//canvas.getContext('2d').drawImage(img,0,0, 30, 30);	     
			var img = new Image();
			img.src = 'redirect.php?i=' + encode64($(e.dragTarget).find('.minmax').attr("src").replace("_z.jpg", ".jpg"));
			$("#container").addClass("loadc");
			img.onload = function () {
				canvas.getContext('2d').drawImage(img, 0, 0, $('#iv').width(), $('#iv').height());
				var myImage = canvas.toDataURL();
				canvas.getContext('2d').strokeStyle = $('.pallette').css('background-color');
				$("#container").removeClass("loadc");
				getAlike();
			};
		}
	});
});

$(window).bind("load resize",function() {
            $('.ivid').css('height', $('.ivid').width() * 0.5775 );
});

function rebindDrop() {
$('#iv').unbind("drop");
$('#iv').bind("drop", function (e) {

	var ratio = $(e.dragTarget).find(">:first-child").height() / $(e.dragTarget).find(">:first-child").width();
	canvas = document.getElementById('iv');

	$('#iv').animate({
		height: $('#iv').width() * ratio
	}, {
		duration: 200,
		step: function (now, fx) {
			$(".block:gt(0)").css("left", now);
			canvas.setAttribute('height', $('#iv').width() * ratio);
		},
		complete: function () {
			rebindDrop();
			//var img = new Image();
			//img.src = 'pfs.jpg';
			//canvas.getContext('2d').drawImage(img,0,0, 30, 30);	     
			var img = new Image();
			img.src = 'redirect.php?i=' + encode64($(e.dragTarget).find('.minmax').attr("src").replace("_z.jpg", ".jpg"));
			$("#container").addClass("loadc");
			img.onload = function () {
				canvas.getContext('2d').drawImage(img, 0, 0, $('#iv').width(), $('#iv').height());
				var myImage = canvas.toDataURL();
				canvas.getContext('2d').strokeStyle = $('.pallette').css('background-color');
				$("#container").removeClass("loadc");
				getAlike();
			};
		}
	});
});
}

$('#iv').bind('dropstart', function () {
	$(this).addClass('act');
});

$('#iv').bind('dropend', function () {
	$(this).removeClass('act');
});

function scrollWin() {
	$('html, body').animate({
		scrollTop: 0
	}, 500);
}

$('#any').ColorPicker({
	color: '#0000ff',
	onShow: function (colpkr) {
		$(colpkr).css('z-index', 21);
		$(colpkr).fadeIn(500);
		return false;
	},
	onHide: function (colpkr) {
		$(colpkr).fadeOut(500);
		return false;
	},
	onChange: function (hsb, hex, rgb) {
		$('#any').css('backgroundColor', '#' + hex);
		canvas = document.getElementById('iv');
		canvas.getContext('2d').strokeStyle = '#' + hex;
		color = hex2rgb(hex);
		//console.log(color);
	}
});

/////////////////////////// IE BULLPOOP
var xdr;

function readdata() {
	alert(xdr.responseText);
	alert("Content-type: " + xdr.contentType);
	alert("Length: " + xdr.responseText.length);
}

function err() {
	alert("XDR onerror");
	alert("Got: " + xdr.responseText);
}

function timeo() {
	alert("XDR ontimeout");
}

function loadd() {
	//alert("XDR onload");
	//alert("Got: " + xdr.responseText);
	msg = xdr.responseText
	$('#imgs').empty();
	found = eval("(" + msg + ")");
	var c = 0;
	for (var key in found) {
		if (c == 50) break;
		if (found.hasOwnProperty(key)) {
			//alert(key + " -> " + found[key]);
			var newimg = $('<div class="ifnd"><img src="' + found[key] + '" class="minmax" alt="' + key + '" onload="$(this).fadeIn()" title="' + key + '" /></div>');
			//var newimg = $('<div class="ifnd"><img src="file://C:/Users/David/workspace/Skerch'+ found[key] +'" class="minmax" alt="'+key+'" onload="$(this).fadeIn()" title="'+key+'" /></div>');
			attach_ev(newimg);
			$('#imgs').append(newimg);
			++c;
		}
	}
	scrollWin();
}

function progres() {
	//alert("XDR onprogress");
	//alert("Got: " + xdr.responseText);
}

function stopdata() {
	xdr.abort();
}

function mytest(x) {
	//document.write(x);
	if (window.XDomainRequest) {
		xdr = new XDomainRequest();
		if (xdr) {
			xdr.onerror = err;
			xdr.ontimeout = timeo;
			xdr.onprogress = progres;
			xdr.onload = loadd;

			xdr.timeout = 5000;
			xdr.open("POST", "http://68.5.135.176:8941/gimme");
			xdr.send("field=" + x);
		} else {
			alert('Failed to create');
		}
	} else {
		alert('XDR doesn\'t exist');
	}
}

function preload(arrayOfImages) {
	$(arrayOfImages).each(function () {
		$('<img/>')[0].src = this;
		// Alternatively you could use:
		// (new Image()).src = this;
	});
}

function resize_ifnd(el) {
	//if (parent().width() != el.width())
	//el.parent().width(el.width());
}

function handleMenu() {
	$(".button").click(function () {
		$(this).not('.clear').not('.upload').addClass("toggled");
		if ($(this).hasClass('toggleable')) {
			$('.toggleable').not(this).removeClass("toggled");
		}
		if ($(this).hasClass('draw'))
			tool = new tool_pencil();
		if ($(this).hasClass('fill'))
			tool = new tool_fill();
		if ($(this).hasClass('clear'))
			clearCanvasYesNo();
		if ($(this).hasClass('upload')) {
			$('#uploadpopup').css('top', $(this).position().top+70);
			$('#uploadpopup').css('left', $(this).position().left);
			$('#uploadpopup').fadeIn();			
		}
	});
}

function attachBubbles() {
        $('.bubbleInfo').each(function () {
            var distance = 10;
            var time = 250;
            var hideDelay = 500;

            var hideDelayTimer = null;

            var beingShown = false;
            var shown = false;
            var trigger = $('.trigger', this);
            var info = $('.popup', this).css('opacity', 0);
            
            $([trigger.get(0), info.get(0)]).mouseover(function () {
                if (hideDelayTimer) clearTimeout(hideDelayTimer);
                if (beingShown || shown) {
                    // don't trigger the animation again
                    return;
                } else {
                    // reset position of info box
                    beingShown = true;

                    info.css({
                        top: trigger.offset().top - 38,
                        left: trigger.offset().left,
                        display: 'block'
                    }).animate({
                        top: '-=' + distance + 'px',
                        opacity: 1
                    }, time, 'swing', function() {
                        beingShown = false;
                        shown = true;
                    });
                }

                return false;
            }).mouseout(function () {
                if (hideDelayTimer) clearTimeout(hideDelayTimer);
                hideDelayTimer = setTimeout(function () {
                    hideDelayTimer = null;
                    info.animate({
                        top: '-=' + distance + 'px',
                        opacity: 0
                    }, time, 'swing', function () {
                        shown = false;
                        info.css('display', 'none');
                    });

                }, hideDelay);

                return false;
            });
        });
}

// prepare the form when the DOM is ready 
$(document).ready(function() { 
    var options = { 
        target:        '#output',   // target element(s) to be updated with server response 
        beforeSubmit:  showRequest,  // pre-submit callback 
        success:       showResponse,  // post-submit callback 
 
        // other available options: 
        //url:       url         // override for form's 'action' attribute 
        //type:      type        // 'get' or 'post', override for form's 'method' attribute 
        //dataType:  'json',        // 'xml', 'script', or 'json' (expected server response type) 
        clearForm: true,        // clear all form fields after successful submit 
        resetForm: true        // reset the form after successful submit 
 
        // $.ajax options can be used here too, for example: 
        //timeout:   3000 
    }; 
 
    // bind to the form's submit event 
    $('#uploadForm').submit(function() { 
        // inside event callbacks 'this' is the DOM element so we first 
        // wrap it in a jQuery object and then invoke ajaxSubmit 
        $(this).ajaxSubmit(options); 
 
        // !!! Important !!! 
        // always return false to prevent standard browser submit and page navigation 
        return false; 
    }); 
}); 
 
// pre-submit callback 
function showRequest(formData, jqForm, options) { 
    // formData is an array; here we use $.param to convert it to a string to display it 
    // but the form plugin does this for you automatically when it submits the data 
    var queryString = $.param(formData); 
 
    // jqForm is a jQuery object encapsulating the form element.  To access the 
    // DOM element for the form do this: 
    // var formElement = jqForm[0]; 
 
    //alert('About to submit: \n\n' + queryString); 
 
    // here we could return false to prevent the form from being submitted; 
    // returning anything other than false will allow the form submit to continue 
    return true; 
} 
 
// post-submit callback 
function showResponse(responseText, statusText, xhr, $form)  { 
    // for normal html responses, the first argument to the success callback 
    // is the XMLHttpRequest object's responseText property 
 
    // if the ajaxSubmit method was passed an Options Object with the dataType 
    // property set to 'xml' then the first argument to the success callback 
    // is the XMLHttpRequest object's responseXML property 
 
    // if the ajaxSubmit method was passed an Options Object with the dataType 
    // property set to 'json' then the first argument to the success callback 
    // is the json data object returned by the server 
    
    var j = eval('(' + responseText + ')');
    if (j['error'])
    	alert(j['error']);
    else {
	var ratio = j['ratio'];
	canvas = document.getElementById('iv');

	$('#iv').animate({
		height: $('#iv').width() * ratio
	}, {
		duration: 200,
		step: function (now, fx) {
			$(".block:gt(0)").css("left", now);
			canvas.setAttribute('height', $('#iv').width() * ratio);
		},
		complete: function () {
			rebindDrop();
			var img = new Image();
			img.src = j['ok'];
			$("#container").addClass("loadc");
			img.onload = function () {
				canvas.getContext('2d').drawImage(img, 0, 0, $('#iv').width(), $('#iv').height());
				var myImage = canvas.toDataURL();
				canvas.getContext('2d').strokeStyle = $('.pallette').css('background-color');
				$("#container").removeClass("loadc");
				getAlike();
				$('#uploadpopup').fadeOut();
			};
		}
	});    
	
    }
} 

function moreResults() {
	var c = 0;
	for (var key in found) {
		if (c == 50) break;
		if (found.hasOwnProperty(key)) {
			//alert(key + " -> " + found[key]);
			var newimg = $('<div class="bubbleInfo ifnd"><img src="' + found[key].replace("_z.jpg", "_m.jpg") + '" class="minmax trigger" alt="&nbsp;" onload="" title="" /><div class="popup tooltip"> \
				<div> \
				<div class="inline leftt">URL:</div> \
				<div class="inline rightt">&nbsp;<a target="_blank" href="http://flic.kr/p/6MQYyj">original</a></div> \
				<br /> \
				<div class="inline leftt">&Delta;:</div> \
				<div class="inline rightt">&nbsp;' + key + '</div> \
				<div class="darrow">\
				</div></div>');
			attach_ev(newimg);
			$('#imgs').append(newimg);
			delete found[key];
			++c;
		}
		//$('#imgs').masonry({ columnWidth: 128 });
				
	}
	attachBubbles();
}

    function ShowVid() {

        $( "#dialog-modal" ).dialog({
            height: 470,
                        width: 550,
            modal: true
        });
    }


function between(strToParse, strStart, strFinish) {
	var str = strToParse.match(strStart + "(.*?)" + strFinish);
	if (str != null) {
		return str[1];
	} else {
		return null;
	}
}

function flickr_shortUrl (num) {
    if (typeof num !== 'number') num = parseInt(num);
    var enc = '',
        alpha = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    var div = num,
        mod;
    while (num >= 58) {
        div = num / 58;
        mod = num - (58 * Math.floor(div));
        enc = '' + alpha.substr(mod, 1) + enc;
        num = Math.floor(div);
    }
    return (div) ? '' + alpha.substr(div, 1) + enc : enc;
}

$('#about').click(function () {
	aboutSkrch();
});

function aboutSkrch() {
	$('#info').html('\
	<h3>about skrch</h3>\
	<div class="block">skrch is a search engine that tries to find similar images to the one drew by the user\
	by comparing HSV histograms and edge descriptors (generated by a Canny filter). skrch also works via drag\'n\'drop and with uploads\
	</div>\
	<div class="block">The first step in preparing an image for serialization is denoising and preparing the HSV histogram.\
	The image is blurred slightly and the Gaussian filter coefficients are given by:\
	<p style="text-align:center"><img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/11190bc8492c4440ffa39bdde58d6130ecd95b65.png" /></p>\
	where <img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/db2f171d360b22ed4b05a26534c8adc2d097b02e.png" /> and\
	<img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/10f32377ac67d94f764f12a15ea987e88c85d3e1.png" /> is the scale factor chosen so that\
	<img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/805c0243c96c2840bee45745648d570fb2a054e8.png" />. The computed coefficient matrix is of size\
	<img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/8efdba1f8ac27e903f86de5afbf4a806d5be0c40.png" />. \
	<img src="http://opencv.willowgarage.com/documentation/cpp/_images/math/10f32377ac67d94f764f12a15ea987e88c85d3e1.png" /> is dependant on image size so the kernel will not produce\
	images that are too blurry when small or not blurry enough when large. This first Gaussian pass is independent from the latter Canny denoising.\
	</div>\
	');
}