// ==UserScript==
// @name         Save SD-webui images to Eagle
// @description  add image(s) to local Eagle App, with AUTOMATIC1111 webui
// @author       bbc_mc <github.com/bbc-mc>
// @namespace    com.github.bbc_mc
// @homepageURL  https://www.github.com/bbc-mc
// @license      MIT License

// @match        https://2417b2bbfe49860e.gradio.app/
// @match        http://localhost:7860/?__theme=dark

// @grant        GM_xmlhttpRequest
// @date         2022/11/24
// @modified     2022/11/24
// @version      0.0.0
// @run-at       context-menu
// ==/UserScript==

// 2022/11/24
// バグあり
// txt2img_gallery 内で画像クリックしたときに表示される pnginfo を
// データとして利用しているため、処理速度が上げられない。
// 現在は適切に調整できていないため、別の画像の pnginfo を参照してしまうバグあり。


(function() {

    // 設定
    const enable_output_positive_prompt_as_tag = 1; // 0:disabled, 1:enabled
    const enable_output_negative_prompt_as_tag = 1; // 0:disabled, 1:enabled, 2:enabled as "n:<tag>"

    // Eagle サーバ設定。末尾に / なし
    const EAGLE_SERVER_URL = "http://localhost:41595";

    // Generation Info が表示されるまでの待ち時間
    const wait_delay_till_generationinfo = 1000;

    const DEBUG = false;

    // 定数
    const EAGLE_API_ITEM_ADDFROM_URLS = `${EAGLE_SERVER_URL}/api/item/addFromURLs`;
    const EAGLE_API_ITEM_ADDFROM_URL  = `${EAGLE_SERVER_URL}/api/item/addFromURL`;
    const TARGET_ID = "txt2img_gallery";
    const sleep = waitTime => new Promise( resolve => setTimeout(resolve, waitTime) );

    // グローバル変数
    var items_to_eagle = {"items":[]};

    function dprint(str){
        if(DEBUG){
            console.log(str);
        }
    }

    function add_url_to_eagle(file_url, folderId, geninfo){
        if( (file_url == null) || (file_url == "") ) return;
        var _options = {"url":"", "name":""};

        _options["url"] = file_url;
        _options["name"] = file_url.match(".+/(.+?)([\?#;].*)?$")[1];
        if ((folderId != null) && (folderId != "")){
            _options["folderId"] = folderId;
        }
        if ((geninfo != null) && (geninfo != "")){
            _options["annotation"] = geninfo;

            var lines = geninfo.split( '\n' );
            var tags = [];
            // positive prompt
            if(enable_output_positive_prompt_as_tag > 0){
                if(lines[0] != ""){
                    let _tags = lines[0].split(",");
                    _tags = _tags.map(s => s.trim());
                    Array.prototype.push.apply(tags, _tags);
                }
            }
            // negative prompt
            if(enable_output_negative_prompt_as_tag > 0){
                if((lines[1] != "") && (lines[1] != "Negative prompt:")){
                    let _tags = lines[1].replace("Negative prompt:", "").split(",");
                    if(enable_output_negative_prompt_as_tag == 2){
                        _tags = _tags.map(s => "n:" + s.trim());
                    }else{
                        _tags = _tags.map(s => s.trim());
                    }
                    Array.prototype.push.apply(tags, _tags);
                }
            }
            if(tags.length > 0){
                _options["tags"] = tags;
            }
        }
        addFromURL(_options);
    };

    var addFromURLS = function() {
        GM_xmlhttpRequest({
            url: EAGLE_API_ITEM_ADDFROM_URLS,
            method: "POST",
            data: JSON.stringify(items_to_eagle),
            onload: function(response) {dprint(response);}
        });
    };

    var addFromURL = function(item_to_eagle) {
        GM_xmlhttpRequest({
            url: EAGLE_API_ITEM_ADDFROM_URL,
            method: "POST",
            data: JSON.stringify(item_to_eagle),
            onload: function(response) {dprint(response);}
        });
    };

    function toBase64Url(url, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var reader = new FileReader();
            reader.onloadend = function() {
                callback(reader.result);
            }
            reader.readAsDataURL(xhr.response);
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    }

    function on_send_images(){
        var images = gradioApp().querySelectorAll("#txt2img_gallery > div > div > button.gallery-item img");
        for(var i=0; i<images.length; i++){
            images[i].click();
            sleep(wait_delay_till_generationinfo);
            toBase64Url(images[i].src, function(base64Url){
                var geninfo = gradioApp().querySelector("#save_txt2img").parentElement.nextElementSibling.nextElementSibling.nextElementSibling.querySelector("p").textContent;
                add_url_to_eagle(base64Url, "", geninfo);
            });
        }
    }

    // exec
    on_send_images();

})();