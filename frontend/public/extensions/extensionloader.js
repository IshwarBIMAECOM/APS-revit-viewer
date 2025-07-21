/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by APS Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    console.log('🔧 ExtensionLoader: Document ready, starting initialization');
    loadJSON(init);
});

function init(config){    
    console.log('🔧 ExtensionLoader: Initializing with config:', config);
    
    var Extensions = config.Extensions;
    var loaderconfig = {"initialload":false}
    
    console.log('📦 ExtensionLoader: Loading extension files for', Extensions.length, 'extensions');
    Extensions.forEach(element => {
        console.log('📦 Loading files for extension:', element.name);
        let path = "extensions/"+element.name+"/contents/";
        element.filestoload.cssfiles.forEach(ele => {
            console.log('📦 Loading CSS:', path+ele);
            loadjscssfile((path+ele), 'css');
        });
        element.filestoload.jsfiles.forEach(ele => {
            console.log('📦 Loading JS:', path+ele);
            loadjscssfile((path+ele), 'js');
        });
    });
    
    console.log('👂 ExtensionLoader: Setting up event listeners');
    document.addEventListener('loadextension',function(e){
        console.log('🎯 ExtensionLoader: loadextension event received:', e.detail);
        loaderconfig.Viewer = e.detail.viewer;
        
        try {
            console.log('🚀 ExtensionLoader: Loading extension via viewer.loadExtension()');
            e.detail.viewer.loadExtension(e.detail.extension);
            console.log('✅ ExtensionLoader: Extension loaded successfully');
        } catch (error) {
            console.error('❌ ExtensionLoader: Error loading extension:', error);
        }
    });
    
    document.addEventListener('unloadextension',function(e){
        console.log('🎯 ExtensionLoader: unloadextension event received:', e.detail);
        try {
            e.detail.viewer.unloadExtension(e.detail.extension);
            console.log('✅ ExtensionLoader: Extension unloaded successfully');
        } catch (error) {
            console.error('❌ ExtensionLoader: Error unloading extension:', error);
        }
    });
    
    document.addEventListener('viewerinstance',function(e){
        console.log('🎯 ExtensionLoader: viewerinstance event received:', e.detail);
        loaderconfig.Viewer = e.detail.viewer;
        
        if (!loaderconfig.initialload) {
            console.log('🚀 ExtensionLoader: Loading startup extensions');
            loadStartupExtensions();
            loaderconfig.initialload = true;
        }
        
        // Handle UI lists (safely check for element existence)
        if (config.ListConfig && config.ListConfig.ListId) {
            const listElement = document.getElementById(config.ListConfig.ListId);
            if (listElement) {
                listElement.style.display = 'block';
                console.log('✅ ExtensionLoader: Extension list element shown');
            } else {
                console.log('ℹ️ ExtensionLoader: Extension list element not found (this is normal)');
            }
        }
        
        if(config.InbuiltExtensionsConfig && config.InbuiltExtensionsConfig.CreateList === "true") {
            console.log('🔧 ExtensionLoader: Creating built-in extensions list');
            ListInbuiltExtensions();
        }
        if(config.ListConfig && config.ListConfig.CreateList === "true") {
            console.log('🔧 ExtensionLoader: Creating custom extensions list');
            CreateList();
        }
    });

    function loadStartupExtensions(){
        console.log('🚀 ExtensionLoader: loadStartupExtensions() called');
        Extensions.forEach(element => {
            console.log('🔍 ExtensionLoader: Checking extension:', element.name, 'loadonstartup:', element.loadonstartup);
            if (element.loadonstartup === "true") {
                console.log('🚀 ExtensionLoader: Loading startup extension:', element.name);
                try {
                    loaderconfig.Viewer.loadExtension(element.name);
                    console.log('✅ ExtensionLoader: Startup extension loaded:', element.name);
                } catch (error) {
                    console.error('❌ ExtensionLoader: Error loading startup extension:', element.name, error);
                }
            }
        });
    }    

    function CreateList() {        
        console.log('🎨 ExtensionLoader: Creating extension list UI');
        var list = document.getElementById(config.ListConfig.ListId);
        if (!list) {
            console.warn('⚠️ ExtensionLoader: Extension list element not found');
            return;
        }
        
        var ExtensionList = '';
        let index = 0;
        Extensions.forEach(element => {
            if (element.includeinlist === "true") {                
                let name = element.name;
                let checked = '';  
                let editoptions = '';  
                if(element.loadonstartup === 'true') checked = ' checked ';
                if(element.editoptions === 'true') editoptions = '&nbsp;<i class="fas fa-cog editoptions" data-index="'+index+'"  data-toggle="modal" data-target="#editConfigModal"></i>';
                ExtensionList += '<label><input class="checkextension" type="checkbox"'+checked+' name="'+name+'" value="'+name+'" data-index="'+index+'"> '+element.displayname+'</label>&nbsp;<i class="fas fa-info-circle details" data-toggle="popover" ></i>'+editoptions+'<br>';
            }
            index++;
        });
        list.innerHTML = ExtensionList;
        var checkbox = document.getElementsByClassName('checkextension');
        for (var i=0; i < checkbox.length; i++) {
            checkbox.item(i).onclick = togglecustomextension;
            let index = checkbox.item(i).attributes['data-index'].value;
            let element = Extensions[index];
            let  moredetails = '';
            let gif = '';                
            if(element.bloglink) moredetails = '<a target="_blank" href="'+element.bloglink+'">Learn more</a>';
            if(element.gif) gif = '<br><img src="./extensions/'+element.name+'/extension.gif" alt="Sample Image">';
            let contents = '<p>'+Extensions[index].description+'</p>'+moredetails+gif;
            $(checkbox.item(i).parentNode).next().popover({
                html : true,
                container: 'body',
                boundary: 'viewport',
                title: Extensions[index].displayname,
                placement:'left',
                content : contents
            });
            $("html").on("mouseup", function (e) {
                var l = $(e.target);
                if (l[0].className.indexOf("popover") == -1) {
                    $(".popover").each(function () {
                        $(this).popover("hide");
                    });
                }
            });
        }
        if (window.extension) {
            $("input:checkbox[value='"+window.extension+"']").click();
        }
        // $('[data-toggle="popover"]').popover();
        let editbuttons = document.getElementsByClassName('editoptions');
        for (var i=0; i < editbuttons.length; i++) {
            let index = editbuttons.item(i).attributes['data-index'].value;
            editbuttons.item(i).onclick = editextensionconfig;
        }
        let editoptionindex;
        function editextensionconfig(e) {
            editoptionindex = parseInt( e.target.getAttribute('data-index') );
            let element = Extensions[editoptionindex];
            console.log(element.options);
            let options = JSON.stringify(element.options, undefined, 2);
            document.getElementById("editextensionconfig").value = options;
            document.getElementById("learnmore").setAttribute('href',element.bloglink);
        }
        document.getElementById("saveconfig").onclick = saveoptions;
        function saveoptions() {
            console.log(editoptionindex);
            Extensions[editoptionindex].options = JSON.parse(document.getElementById('editextensionconfig').value);
            loaderconfig.Viewer.unloadExtension(Extensions[editoptionindex].name);
            loaderconfig.Viewer.loadExtension(Extensions[editoptionindex].name,Extensions[editoptionindex].options);
        }
        function togglecustomextension(e) {
            console.log(e.target.value)
            if (e.target.checked) {
                loaderconfig.Viewer.loadExtension(e.target.value,Extensions[parseInt(this.dataset.index)].options)
            } else {
                loaderconfig.Viewer.unloadExtension(e.target.value)
            }
        }     
    }

    function ListInbuiltExtensions() {
        console.log('🎨 ExtensionLoader: Creating built-in extensions list');
        let Extensions = config.InbuiltExtensions;
        let list = document.getElementById(config.InbuiltExtensionsConfig.ListId);
        if (!list) {
            console.warn('⚠️ ExtensionLoader: Built-in extensions list element not found');
            return;
        }
        
        let ExtensionList = '';
        for (let index = 0; index < Extensions.length; index++) {
            let element = Extensions[index];
            if (element.includeinlist !== "false") {                
                let checked = '';
                if(element.default === 'true') checked = ' checked ';
                ExtensionList += '<label><input class="checkextensionbuiltin" type="checkbox"'+checked+' name="'+element.name+'" value="'+element.name+'"> '+element.name.slice(9,element.name.length)+'</label><br>';
            }
            
        };
        list.innerHTML = ExtensionList;
        let checkbox = document.getElementsByClassName('checkextensionbuiltin');
        for (var i=0; i < checkbox.length; i++) {
            checkbox.item(i).onclick = togglebuiltinextension;
        }
        function togglebuiltinextension(e) {
            console.log(e.target.value)
            if (e.target.checked) {
                loaderconfig.Viewer.loadExtension(e.target.value)
            } else {
                loaderconfig.Viewer.unloadExtension(e.target.value)
            }
        }
    }

    function loadjscssfile(filename, filetype){
        console.log('📦 ExtensionLoader: Loading file:', filename, 'type:', filetype);
        
        if (filetype=="js"){ 
            var fileref=document.createElement('script')
            fileref.setAttribute("type","text/javascript")
            fileref.setAttribute("src", filename)
        }
        else if (filetype=="css"){ 
            var fileref=document.createElement("link")
            fileref.setAttribute("rel", "stylesheet")
            fileref.setAttribute("type", "text/css")
            fileref.setAttribute("href", filename)
        }
        if (typeof fileref!="undefined");
        document.getElementsByTagName("head")[0].appendChild(fileref);
        
        console.log('✅ ExtensionLoader: File loaded successfully:', filename);
    }
}   

function loadJSON(callback) {   
    console.log('📄 ExtensionLoader: Loading config.json');
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'extensions/config.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            console.log('✅ ExtensionLoader: Config loaded successfully');
            callback(JSON.parse(xobj.responseText));
        } else if (xobj.readyState == 4) {
            console.error('❌ ExtensionLoader: Failed to load config.json, status:', xobj.status);
        }
    };
    xobj.send(null);  
}
