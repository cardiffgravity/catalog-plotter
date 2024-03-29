/*
	Translation library
*/
// Extend jQuery
(function ($) {


	// Get the URL query string and parse it
	jQuery.query = function() {
			var r = {length:0};
			var q = location.search;
		if(q && q != '#'){
			// remove the leading ? and trailing &
			q = q.replace(/^\?/,'').replace(/\&$/,'');
			jQuery.each(q.split('&'), function(){
				var key = this.split('=')[0];
				var val = this.split('=')[1];
				if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
				r[key] = val;
				r['length']++;
			});
		}
			return r;
	};

	function Translator(inp){

		this.q = $.query();

		this.id = (inp && typeof inp.id==="string") ? inp.id : 'form';
		this.master = (inp && typeof inp.master==="string") ? inp.master : '';
		this.json = (inp && typeof inp.json==="string") ? inp.json : '';
		this.langs = (inp && typeof inp.langs==="object") ? inp.langs : { 'en':'English' };

		// Load the master language config file
		this.setLanguage()

		this.lang = this.q.lang;
		if(!this.lang) this.lang = "en";
		this.langdefault="en";
		this.page = $('#'+this.id);

		html = "<form id=\"langchoice\"><label>Select language (not all are complete):</label><select name=\"lang\">"
		for(var l in this.langs) html += '<option name="'+l+'" value="'+l+'"'+(this.lang==l ? " selected" : "")+'>'+this.langs[l]+'</option>';
		html += "</select></form>";

		if($('#translate_chooser').length == 0) this.page.prepend('<div id="translate_chooser"></div>');
		if($('#translation').length == 0) this.page.append('<div id="translation"></div>')
		$('#translate_chooser').html(html).find('#langchoice select').bind('change',{me:this},function(e){ e.data.me.setLanguage($(this).find("option:selected").val()); });

		this.setLanguage(this.lang);
		$('#hidecomp').prop('checked',false)
		return this;
	}

	Translator.prototype.setLanguage = function(lang){
		if(lang) this.lang = lang;
		this.loadLanguage(this.lang,function(e){
			if(e.lang){
				this.lang = e.lang;
				this.phrasebook = (e.data) ? e.data : { 'meta.name':'','meta.code':e.lang };
			}else{
				this.masterbook = e.data;
			}
			this.loadLanguage(this.langdefault,function(e){
				this.phrasebookdefault = (e.data) ? e.data : { 'meta.name':'','meta.code':e.lang };
				this.rebuildForm();
				if(e.lang){
					var hrefcat = $('a.langlinkcat').attr('href');
					$('a.langlinkcat').attr('href',
						hrefcat.substring(0,hrefcat.indexOf('?'))+'?lang='+this.phrasebook['meta.code']);
					var hrefbub = $('a.langlinkbub').attr('href');
					$('a.langlinkbub').attr('href',
						hrefbub.substring(0,hrefbub.indexOf('?'))+'?lang='+this.phrasebook['meta.code']);
					$('.langname').html(this.phrasebook['meta.name']);
				}
			});
		});
		$('#hidecomp').prop('checked',false);
		return this;
	}

	Translator.prototype.loadLanguage = function(lang,callback,langdummy){
		var url = (lang) ? this.json.replace('%LANG%',lang) : this.master;
		if(typeof langdummy=="string") lang = langdummy;
		if(lang) this.lang = lang;
		$.ajax({
			url: url,
			method: 'GET',
			dataType: 'json',
			context: this,
			error: function(){
				// We couldn't find this language so load the English version
				// so there is something to work from.
				console.log("Couldn't load "+lang)
				if(lang != "en") this.loadLanguage('en',callback,lang);
				$('#hidecomp').css('display','none');
				$('#hidecomp-lab').css('display','unset');
			},
			success: function(data){
				// Update the language code and name
				if(data && data["meta.code"] && typeof data["meta.code"]==="string") data["meta.code"] = lang;
				if(data && data["meta.code"] && typeof data["meta.code"]==="string") data["meta.name"] = this.langs[lang];
				if(typeof callback==="function") callback.call(this,{data:data,lang:lang});
				$('#hidecomp').css('display','unset');
				$('#hidecomp-lab').css('display','unset');
			}
		});

	}

	Translator.prototype.rebuildForm = function(){

		var html = "<form id=\"language\">";
		html += this.buildForm(this.masterbook,this.phrasebook,this.phrasebookdefault,"");
		html += "</form>";

		$('#translation').html(html);

		$('#translation input, #translation textarea, #translation select').attr('dir',(this.phrasebook && this.phrasebook["meta.alignment"] && this.phrasebook["meta.alignment"]=="right" ? "rtl" : "ltr")).unbind().bind('change',{me:this},function(e){
			e.data.me.getOutput();
			e.data.me.percentComplete();
			console.log(this);
		});

		// Update the text direction when the appropriate select box changes
		$('#translation select[name=".meta.alignment"]').on('change',function(e){
			$('#translation input, #translation textarea, #translation select').attr('dir',($(this).val()=="right" ? "rtl" : "ltr" ));
		});

		this.getOutput();
		this.percentComplete();

		return this;

	}


	Translator.prototype.buildForm = function(m,p,d,k){

		var html = "";
		var newk = "";
		var inp = "";
		var arr = false;
		var n;
		var css;
		var ldef = this.phrasebookdefault["meta.name"];
		var inpdef="";

		if(!k) k = "";

		for(key in m){
			n = parseInt(key);
			newk = k+"."+key;

			if(typeof m[key]==="object"){

				if(n >= 0 && this.previousgroup != n) html += '</div>';

				if(m[key]._text && m[key]._type){
					inp = "";
					cl= sanitize((m[key]._highlight ? "highlight" : ""))
					cl= sanitize((p && p[key] ? cl : "blank"))
					if(m[key]._type=="textarea"){
						css = (m[key]._height) ? ' style="height:'+m[key]._height+'"' : "";

						inpdef = sanitize((d && d[key] ? d[key] : ""));
						inp = '<textarea class="'+cl+'" name="'+newk+'"'+css+'>'+sanitize((p && p[key] ? p[key] : (m[key]._usedef) ? inpdef : ""))+'</textarea>';
					}else if(m[key]._type=="noedit"){
						inp = '<input type="hidden" name="'+newk+'" value="'+sanitize((p ? p[key] : ""))+'" />'+sanitize((p ? p[key] : ""));
						inpdef : "";
					}else if(m[key]._type=="select"){
						inp = '<select name="'+newk+'">';
						for(var o = 0; o < m[key]._options.length ; o++){
							var seldef = (d && m[key]._options[o].value==d[key]) ? ' selected="selected"' : '';
							var sel = (p && m[key]._options[o].value==p[key]) ? ' selected="selected"' : (m[key]._usedef) ? seldef : '';
							inp += '<option value="'+m[key]._options[o].value+'"'+sel+'>'+m[key]._options[o].name+'</option>'
						}
						inp += '</select>';
						inpdef = sanitize((d && d[key] ? d[key] : ""));
					}else if(m[key]._type=="string"){
						inpdef = sanitize((d && d[key] ? d[key] : ""));
						inp = '<input type="text" class="'+cl+'" name="'+newk+'" value="'+sanitize((p && p[key] ? p[key] : ((m[key]._usedef) ? inpdef : "")))+'" />';
					}
					html += this.row((m[key]._title ? m[key]._title : key),m[key]._text,inp,ldef,inpdef);
				}else{

					// If this section has a title
					if(m[key]._title){html += '<h2>'+m[key]._title+'</h2>';}
					if(m[key]._subtitle) html += '<h3>'+m[key]._subtitle+'</h3>';
					if(m[key]._text){
						html += "	<div class=\"subt\">";
						html += "		<p>"+m[key]._text+"</p>";
						html += "	</div>";
					}
					if(n >= 0) html += '<div class="group">';

					html += this.buildForm(m[key],(p) ? p[key] : {}, newk,(d) ? d[key] : {});
					this.previousgroup = n;
				}
			}
		}

		return html;
	}

	Translator.prototype.percentComplete = function(){
		var percent = 100;
		if(this.lang!="en"){
			var total = 0;
			var diff = 0;
/*
			for(var i = 0 in this.chromo.phrasebook){
				if(i!="alignment" && i!="code" && i != "lang" && i!="helpmenu" && i!="gal" && i!="eq" && i!="version"){
					total++;
					var val = converter($("#"+i).val()).replace(/&amp;/g,"&");
					if(this.q.debug) console.log(i,val,this.english[i])
					if(val && val != this.english[i]){
						diff++;
//						$("#fs_"+i).removeClass('same');
					}else{
//						$("#fs_"+i).addClass('same');
					}
				}
			}
*/
			percent = Math.floor(100*diff/total);
		}
		$("#complete").html(percent);
	}

	Translator.prototype.row = function(title,desc,field,ldef,def){
		var id = field.indexOf("id=\"");
		id = field.substr(id+4);
		id = id.substr(0,id.indexOf("\""));

		var html = "	<fieldset>";// id=\"fs"+id+"\">";
		html += "		<legend>"+title+"</legend>";
		html += "		<div class=\"twocol\">";
		html += "			<p>"+desc+"</p>";
		html += "		</div>";
		html += "		<div class=\"fourcol\">";
		html += "			"+field;
		html += "			<div class=\"default\"><strong>"+ldef+" (default):</strong> "+def+"</div>";
		html += "		</div>";
		html += "	</fieldset>";
		// html = "	<div>";// id=\"fs"+id+"\">";
		// html += "		<div class=\"twocol\">";
		// html += "			<p>&nbsp;</p>";
		// html += "		</div>";
		// html += "		<div class=\"fourcol default\">";
		// html += "			"+def;
		// html += "		</div>";
		// html += "	</div>";
		return html;
	}
	Translator.prototype.getOutput = function(){
		var json = sanitize($("form#language").formToJSON(this));
		//json = json.substring(0,json.length-4).substring(17).replace(/\n\t\t/g,'\n\t')+'}';
		var css = (json) ? ' style="height:'+(json.split("\n").length + 5)+'em;font-family:monospace;"' : ''
		var output = '<textarea onfocus="this.select()"'+css+' wrap="off">'+json+"</textarea>";

		if($('#output').length == 0) $('#translation').after('<div id="output"></div>')

		$('#output').html(output);
	}

	/* From http://exceptionallyexceptionalexceptions.blogspot.co.uk/2011/12/convert-html-form-to-json.html */
	$.fn.formToJSON = function(t) {

		function setValue(object, key, value) {
			// // Don't need to split keys on "."
			// var a = path.split('.');
			// // Instead, just use the full key
			var a = [key];
			var o = object;
			for (var i = 0; i < a.length - 1; i++) {
				var n = a[i];
				if (n in o) {
					o = o[n];
				} else {
					o[n] = {};
					o = o[n];
				}
			}
			o[a[a.length - 1]] = value;
		}

		if(t.phrasebook){

			// First of all we need to get a copy of the original JSON structure
			// otherwise we loose arrays
			// var objectG = JSON.parse(JSON.stringify(t.phrasebook));
			var objectG = {}
			// console.log(objectG)
			//loop through all of the input/textarea elements of the form
			var el = this.find('input, textarea, select').each(function(i){
				//ignore the submit button
				if($(this).attr('name') != 'submit') setValue(objectG,$(this).attr('name').substr(1),converter($(this).val()))
			})
		}

		return JSON.stringify(objectG,null, " ");
	};


	function converter(tstr) {
		if(!tstr) return "";
		return tstr;
		// // Don't want to convert character codes
		// var bstr = '';
		// for(var i=0; i<tstr.length; i++){
		// 	if(tstr.charCodeAt(i)>127) bstr += '&amp;#' + tstr.charCodeAt(i) + ';';
		// 	else bstr += tstr.charAt(i);
		// }
		// return bstr;
	}
	function sanitize(str){
		if(str){
			str = str.replace(/</g,"&lt;");
			str = str.replace(/>/g,"&gt;");
			str = str.replace(/"/g,"&quot;");
		}
		return str;
	}

	$.translator = function(placeholder,input) {
		if(typeof input=="object") input.container = placeholder;
		else {
			if(typeof placeholder=="string") input = { container: placeholder };
			else input = placeholder;
		}
		input.plugins = $.translator.plugins;
		return new Translator(input);
	};
	$.translator.plugins = [];

})(jQuery);


