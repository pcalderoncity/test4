    var filesHandler = {

        params:null,
        usuarioPath:null,
        estudiosPath:null,
        ultimaMedicionPath:null,
        estudiosMap:null,
        estudiosList:null,
        campaniasMap:null,
        campaniasList:null,
        timeToRefreshInMillis:200,
        self:null,
        ultimaMedicion : null,
        ultimoLoginPath: null,
        unsentPath:null,
        sentPath:null,
        restClient: null,
        artifactCampaignMap: null,
        utils: null,
        inicializar: function(_params)
        {
            self                    = this;
            self.params             = _params;
            self.estudiosMap        = new Map();
            self.estudiosList       = [];
            self.campaniasMap       = new Map();
            self.campaniasList      = [];
            self.ultimoLoginPath    = "_ultimoLogin.json";
            self.artifactCampaignMap= new Map();
            self.restClient         = new RestClient("http", "app.citymovil.cl/citydata");
            if(self.params == null ) return;
            self.utils              = self.params.utils;
            self.usuarioPath        = self.params.userId + "";
            self.estudiosPath       = self.usuarioPath + "/estudios";
            self.ultimaMedicionPath = self.usuarioPath + "/_ultimaMedicion.json";
            self.unsentPath         = self.usuarioPath + "/unsent";
            self.sentPath           = self.usuarioPath + "/sent";

        },
        uniqueID      : function()
        {
            return '_' + Math.random().toString(36).substr(2, 9);
        },
        prepararDB    : function()
        {
            self.sendToServer();
            return new Promise( (resolve, reject) => {
                self.crearEstructura(self.usuarioPath)
                .then(self.obtenerEstudios)
                .then(self.obtenerCampanias)
                .then(self.obtenerArtifacts)
                .then(self.setEstudios)
                .then(function(_result){
                    return resolve(1);
                })
            })

        },
        getEstudiosList  : function()
        {
            return self.estudiosList;
        },
        getEstudiosMap  : function()
        {
            return self.estudiosMap;
        },
        getCampaniasMap     : function()
        {
            return self.campaniasMap;
        },
        getCampaniasList    : function()
        {
            return self.campaniasList;
        },
        getMedicionPath     : function(_campania, _fileName)
        {
            return self.estudiosPath + "/" + _campania.researchId + "/campanias/" + _campania.id + "/" + _fileName;
        },
        getFechaActual      :function()
        {
            _date = new Date();
            return _date.getDate() + "-" + (_date.getMonth() + 1) + "-" + _date.getFullYear();
        },
        getHoraActual      :function()
        {
            _date = new Date();
            return _date.getHours() + ":" + _date.getMinutes() + ":" + _date.getSeconds();
        },
        getUnsentList:   function()
        {
            return new Promise( (resolve, reject) => {
                console.log("getUnsentList" );
                self.leerArchivos(self.unsentPath, 1)
                .then(function(_myList){
                    console.log("getUnsentList>>>>" + _myList.length);
                    _objectsList = [];
                    _counter = 0;
                    for(let _next = 0; _next < _myList.length; _next++)
                    {
                        $.ajax({
                            url:_myList[_next].toURL(), dataType : 'json',async : false,
                            success : function(data){
                                _counter++;
                                _objectsList.push(data);
                                if(_counter  >= _myList.length ) return resolve({objectsLits:_objectsList, entriesList:_myList});
                            },
                            error: function(XMLHttpRequest, textStatus, errorThrown) {
                                _counter++;
                                console.log(JSON.stringify(textStatus));
                                console.log(JSON.stringify(errorThrown));
                                console.log("Status: " + textStatus);
                                if(_counter  >= _myList.length ) return resolve({objectsLits:_objectsList, entriesList:_myList});
                            }
                        });
                    }
                    //return resolve(_myList);
                })
            })
        },
        sendToServer    :   function()
        {
            console.log("sendToServer>>>>");
            self.getUnsentList()
            .then(function(_myLists){
                let _response = null;
                var _myList =  _myLists.objectsLits;
                var _myEntries =  _myLists.entriesList;
                for(let _next = 0; _next < _myList.length; _next++)
                {
                    if( _myList[_next].sent != null )continue;
                    self.restClient.post("dataCollector/save", _myList[_next])
                    .then((_response)=>{
                        if(_response && _response.id > 0)
                        {
                             _myList[_next].sent = self.utils.getCurrentDate() + " " + self.utils.getCurrentHour();
                             //_myList[_next].sent = self.utils.getFechaActual() + " " + self.getHoraActual();
                             self.escribirArchivo(_myEntries[_next], JSON.stringify(_myList[_next]), false)
                             .then(  function(_result){
                                 return new Promise( (resolve, reject) => {
                                            self.createDirAndReturnEntry(self.sentPath)
                                            .then(_dirEntry=>{
                                                //TODO
                                                // console.log("Moviendo....>>>");
                                                // _fileEntry.moveTo( _dirEntry,
                                                //                 null,
                                                //                 function(_result){console.log("OK>>>>moveTo>>>>" + _result); resolve(1);},
                                                //                 function(_error){console.log("Error>>>>MoveTo>>>>" + _error.code); resolve(-1);});
                                            })
                                        })
                             },
                             function(_error){
                                 console.log("Error escribiendo en medicion>>>>" + _result + ">>>>>" + _error ); reject(0);
                             })
                        }

                    })
                }
            })
        },
        doLogout:           function()
        {
            return new Promise( (resolve, reject) => {
                self.getUltimoLogin()
                .then(function(_ultimoLogin){
                    self.crearArchivo(self.ultimoLoginPath, false)
                    .then(_result=>{
                        _ultimoLogin.fin = new Date();
                        self.escribirArchivo(_result, JSON.stringify(_ultimoLogin), false)
                        .then(  function(_result){console.log("logout grabado>>>>>" + _result); resolve(1);},
                                function(_error){console.log("Error escribiendologout>>>>" + _result + ">>>>>" + _error ); resolve(-1);})

                            },function(_error){console.log( "Error " + _error);resolve(-3)
                    })
                },function(_error){console.log( "Error " + _error);resolve(-3);
                })
            })
        },
        grabarUltimoLogin:  function(_data)
        {
            let _ultimoLogin = {userId : _data.userId, inicio:new Date(), fin: null, username:_data.username};
            return new Promise( (resolve, reject) => {
                self.crearArchivo(self.ultimoLoginPath)
                .then(  function(_result){
                            return new Promise( (resolve, reject) => {
                                console.log( "Login creado?>>>" + _result);
                                self.escribirArchivo(_result, JSON.stringify(_ultimoLogin), false)
                                .then(  function(_result){console.log("login grabado>>>>>" + _result); resolve(1);},
                                        function(_error){console.log("Error escribiendo login>>>>" + _result + ">>>>>" + _error ); reject(0);})
                                .then(function(_result){ console.log("Login escrito...."); resolve(_result)});
                            })
                        },
                        function(_error){console.log( "Archivo login no creado " + _error);Promise.reject(-1);
                    })
                .then(function(_result){
                    console.log("Login Grabado");
                    console.log(_result);
                    return resolve(1);
                })
                .catch(function (error) {
                    console.log("No se pudo crear el login");
                    return resolve(-1);
                })
            })
        },
        getUltimoLogin    : function()
        {
            console.log("getUltimoLogin");
            let _ultimoLogin = null;
            return new Promise( (resolve, reject) => {
                self.crearArchivo(self.ultimoLoginPath, false)
                .then(  function(_fileEntry){
                            return new Promise( (resolve, reject) => {
                            console.log("_fileEntry>>>>" + _fileEntry);
                            if(!_fileEntry) { resolve(0); }
                            console.log("_fileEntry.toURL()>>>>>" + _fileEntry.toURL());
                            $.ajax({
                                url:_fileEntry.toURL(), dataType : 'json',async : false,
                                success : function(data){_ultimoLogin = data; return resolve(1)},
                                error: function(XMLHttpRequest, textStatus, errorThrown) {console.log("Status: " + textStatus); resolve(0)}
                            });
                        })
                })
                .then(function(_result){
                    console.log("_ultimoLogin>>>>>" + _ultimoLogin);
                    console.log("_result>>><"  + _result);
                    console.log(typeof _ultimoLogin);
                    return resolve(_ultimoLogin);
                })
            });
        },
        getUltimaMedicion    : function()
        {
            console.log("Ok>>>Leyendo ultima Medicion>>>>");
            let _ultimaMedicion = null;
            return new Promise( (resolve, reject) => {
                self.crearArchivo(self.ultimaMedicionPath, false)
                .then(function(_fileEntry){
                       if(!_fileEntry) { return Promise.resolve(0); return; }
                       console.log("_fileEntry.toURL()>>>>>" + _fileEntry.toURL());
                       $.ajax({
                           url:_fileEntry.toURL(), dataType : 'json',async : false,
                           success : function(data){_ultimaMedicion = data; return Promise.resolve(1)},
                           error: function(XMLHttpRequest, textStatus, errorThrown) {console.log("Status: " + textStatus); alert("Error: " + errorThrown);return Promise.resolve(0)}
                       });
                })
                .then(function(){
                    console.log("_ultimaMedicion>>>>>" + _ultimaMedicion);
                    console.log(typeof _ultimaMedicion);
                    return resolve(_ultimaMedicion);
                })
            });
        },
        comenzarMedicion    : function(_campania, _cabeceraElements)
        {
            console.log("comenzarMedicion");
            return new Promise( (resolve, reject) => {
                let _nombreMedicion = self.uniqueID() + ".json";
                let _medicion={ id:_nombreMedicion,  path: self.getMedicionPath(_campania, _nombreMedicion), userId: self.params.userId,
                                init: self.utils.getCurrentDate() + " " + self.utils.getCurrentHour() , end: null, deleted:null, sent:null, campaignId: _campania.id,
                                //init: self.getFechaActual() + " " + self.getHoraActual() , end: null, deleted:null, sent:null, campaignId: _campania.id,
                                researchId:_campania.researchId , header:_cabeceraElements,  detail:[]};
                console.log("cbefore Medicion");
                self.grabarMedicion(_medicion)
                .then(function(_result){resolve(_medicion)});
            })
        },
        finishMeasurement   : function(_measurement){
            return new Promise( (resolve, reject) => {
                self.grabarMedicion(_measurement)
                .then(function(_result){
                    return  self.createDirAndReturnEntry(self.unsentPath)
                            .then(function(_dirEntry){
                                return new Promise( (resolve, reject) => {
                                    self.crearArchivo(_measurement.path, false)
                                    .then(function(_fileEntry){
                                        return new Promise( (resolve, reject) => {
                                            _fileEntry.copyTo( _dirEntry,
                                                            _measurement.id,
                                                            function(_result){console.log("OK>>>>finishMeasurement>>>>copyTo>>>>" + _result); resolve(1);},
                                                            function(_error){console.log("Error>>>>finishMeasurement>>>>copyTo>>>>" + _error.code); resolve(-1);});
                                        })
                                    })
                                    .then(function(_result){
                                        if(_result == 1 )
                                        {
                                            let _newElement = {};
                                            _newElement.id          = _measurement.id;
                                            _newElement.campaignId  = _measurement.campaignId;
                                            _newElement.researchId  = _measurement.researchId;
                                            _newElement.init        = _measurement.init;
                                            _newElement.end         = _measurement.end;
                                            _newElement.userId      = _measurement.userId;
                                            _newElement.deleted     = _measurement.deleted;
                                            _newElement.sent        = null;
                                            _newElement.header      = [];
                                            _newElement.detail      = [];
                                            let _newElements = [];
                                            if(_measurement.header && _measurement.header.length > 0)
                                            {
                                                for(let next = 0; next < _measurement.header.length; next++)
                                                    _newElements.push(getInfoToSend(_measurement.header[next]));
                                                    //_newElements.push({id:_measurement.header[next].id, label:_measurement.header[next].label, value: _measurement.header[next].userValue, defaultValue: (_measurement.header[next].defaultValue) ? _measurement.header[next].defaultValue : null });
                                            }
                                            _newElement.header = _newElements;
                                            _newElements = [];
                                            console.log(JSON.stringify(_measurement.detail));
                                            console.log(_measurement.detail.length);
                                            let _elementWithValue = null;
                                            if(_measurement.detail && _measurement.detail.length > 0)
                                            {
                                                for(let next = 0; next < _measurement.detail.length; next++)
                                                {
                                                    if(!_measurement.detail[next]) continue;
                                                    _newElements[next] = [];
                                                    for (let next2 in _measurement.detail[next]) {
                                                        _elementWithValue = null;
                                                        if(_measurement.detail[next][next2].type == _me.ELEMENT_LIST)
                                                        {
                                                            let _lisElement = {};
                                                            _lisElement.id          = _measurement.detail[next][next2].id;
                                                            _lisElement.type        = _measurement.detail[next][next2].type;
                                                            _lisElement.label       = _measurement.detail[next][next2].label;
                                                            _lisElement.optionName  = _measurement.detail[next][next2].optionName;
                                                            _lisElement.optionId    = _measurement.detail[next][next2].optionId;
                                                            //_measurement.detail[next][next2].element = getValidFromList(_measurement.detail[next][next2].element);
                                                            //_newElements[next].push(_measurement.detail[next][next2]);
                                                            _lisElement.element = getValidFromList(_measurement.detail[next][next2].element);
                                                            _newElements[next].push(_lisElement);
                                                            continue;
                                                        }
                                                        _newElements[next].push(getInfoToSend(_measurement.detail[next][next2]));
                                                        //_newElements[next].push({id:_measurement.detail[next][next2].id, type: _measurement.detail[next][next2].type, label:_measurement.detail[next][next2].label, value: _measurement.detail[next][next2].userValue });
                                                    }
                                                }
                                            }
                                            _newElement.detail = _newElements;
                                            console.log("Dir Already Exist");
                                            let _filePath = self.unsentPath + "/" + _measurement.id ;
                                            self.crearArchivo(_filePath, false)
                                            .then(  function(_result){
                                                        self.escribirArchivo(_result, JSON.stringify(_newElement), false)
                                                        .then(  function(_result){console.log("grabado>>>>" + _filePath); resolve(1);},
                                                                function(_error){console.log("No grabado>>>>" + _filePath + ">>>>>" + _error ); resolve(0);});
                                                    },
                                                    function(_error){console.log( "File Not Created>>>" + _error); resolve(-1);})
                                        }
                                        else resolve(_result);
                                    })
                                })
                            })
                            .then(function(_result){
                                return resolve(_result);
                            })
                })
            })

            function getValidFromList(_elements)
            {
                if(!_elements) return null;
                let _newElements = [];
                let _alreadyButton = false;
                for(let _next = 0; _next < _elements.length; _next++ )
                {
                    if(!_elements[_next].userValue || (_elements[_next].type == _me.ELEMENT_BUTTON && _alreadyButton) ) continue;
                    if(_elements[_next].type == _me.ELEMENT_BUTTON) _alreadyButton = true;
                    _newElements.push(getInfoToSend(_elements[_next]));
                }
                return _newElements;
            }
            function getInfoToSend(_element)
            {
                let _newEle = {id:_element.id, type: _element.type, label: _element.label, value: _element.userValue, defaultValue: (_element.defaultValue) ? _element.defaultValue : null };
                return _newEle;
            }
        },
        grabarMedicion: function(_medicion)
        {
            return new Promise( (resolve, reject) => {
                console.log("Grabando medición>>>>" + _medicion.id);
                self.crearArchivo(_medicion.path)
                .then(  function(_result){
                            return new Promise( (resolve, reject) => {
                                if( typeof _result != 'object' || _result == null ) {resolve(-1);return;}
                                //_medicion.fullPath = _result.fullPath;
                                console.log( "Medición creada?>>>" + _result);
                                self.escribirArchivo(_result, JSON.stringify(_medicion), false)
                                .then(  function(_result){console.log("Medicion grabada en directorio de campania>>>>" + _result); resolve(1);},
                                        function(_error){console.log("Error escribiendo en medicion>>>>" + _result + ">>>>>" + _error ); reject(0);});
                            })
                        },
                        function(_error){console.log( "File Not Created>>>" + _error);reject(-1);})
                .then(  function(_result){
                            console.log("Grabando última medición>>>>" + _medicion.id);
                            return new Promise( (resolve, reject) => {
                                self.crearArchivo(self.ultimaMedicionPath)
                                .then(  function(_result){
                                            return new Promise( (resolve, reject) => {
                                                console.log( "File Created>>>" + _result);
                                                self.escribirArchivo(_result, JSON.stringify(_medicion), false)
                                                .then(  function(_result){console.log("Medicion grabada en directorio de usuario>>>>" + _result); resolve(1);},
                                                        function(_error){console.log("Error escribiendo en medicion>>>>" + _result + ">>>>>" + _error  ); reject(-1)});
                                            })
                                        },
                                        function(_error){console.log( "File Not Created>>>" + _error);reject(-1);}
                                )
                                .then(function(_result){
                                        resolve(_medicion);
                                })
                            })
                        }
                )
                .then(function(_result){
                    console.log("comenzamos medicion OK!");
                    console.log(_result);
                    resolve(_medicion);
                    //_ok = true;
                })
                .catch(function (error) {
                    console.log("No se pudo crear el archivo de medición>>>" + error);
                    reject(-1);
                })
            })
        },
        procesarCampanias: function(_estudio)
        {
            console.log("procesarCampanias");
            return new Promise( (resolve, reject) => {
                let myVar = 0;
                let _path = self.estudiosPath + "/" + _estudio.id + "/campanias";
                console.log(_path);
                self.setCampanias(_path)
                .then(function(_result){console.log("Procesar Campanias OK"); resolve(1);})
            })
        },
        crearArchivo : function(_path, _create = true)
        {
            console.log("crearArchivo>>>" + _path);
            return new Promise( (resolve, reject) => {
                    window.requestFileSystem(
                    LocalFileSystem.PERSISTENT, 0,
                    function(fileSystem){ fileSystem.root.getFile(_path, {create: _create},
                                                                function(fileEntry){console.log("file created>>>>" + _path);resolve(fileEntry);},
                                                                function(){console.log("file not created>>>>>"  + _path );resolve(0);});
                }, function(){ console.log("Error creando archivo");console.log(evt.target.error.code);resolve(-1);});
            });
        },
        leerArchivos :   function(_path, _type = 0)
        {
            console.log("leerArchivos");
            return new Promise( (resolve, reject) => {
            //let _ok = false;
            let myMap = new Map();
            window.requestFileSystem(
                LocalFileSystem.PERSISTENT, 0,
                function(fileSystem){
                    fileSystem.root.getDirectory(_path, { create: true },
                                                function(dirEntry){

                                                    let directoryReader = dirEntry.createReader();
                                                    console.log("directoryReader>>>>>");
                                                    console.log(directoryReader);
                                                    directoryReader.readEntries(function(entries){
                                                                                    console.log("Reading entries......" + entries.length);
                                                                                    console.dir(entries);

                                                                                    let _counter = 0;
                                                                                    if(_type == 0 )//mapa de compañias o estudios
                                                                                    {
                                                                                        myMap.clear();
                                                                                        for (var i=0; i<entries.length; i++) {
                                                                                            _counter++;
                                                                                            if(!entries[i].isDirectory ) continue;
                                                                                            myMap.set(entries[i].name, entries[i].toURL() + entries[i].name + ".json");
                                                                                        }
                                                                                        resolve(myMap);
                                                                                    }
                                                                                    else if(_type == 1 ) //lista de files entries
                                                                                    {
                                                                                        let _myEntries = [];
                                                                                        for (var i=0; i<entries.length; i++) {
                                                                                            _counter++;
                                                                                            if(entries[i].isDirectory ) continue;
                                                                                            _myEntries.push(entries[i]);
                                                                                        }
                                                                                        resolve(_myEntries);
                                                                                    }
                                                                                },
                                                                                function(_error){ console.log("Failed to list directory contents: ", _error);resolve(true);});
                                                },
                                                function(_error){console.log("dirEntry2>>>>>");console.log(_error.code);resolve(true);});
                },
                function(){console.log(evt.target.error.code);});
            });

        },
        escribirArchivo : function(fileEntry, dataObj, isAppend)
        {
            console.log("escribirArchivo");
            return new Promise( (resolve, reject) => {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function() {
                        resolve(1);
                        console.log("Successful file read...");
                        };
                    fileWriter.onerror = function (e) {
                        console.log("Failed file read: " + e.toString());
                        resolve(-1);
                    };
                    if (isAppend) {// If we are appending data to file, go to the end of the file.
                        try {fileWriter.seek(fileWriter.length);}
                        catch (e) {console.log("file doesn't exist!");}
                    }
                    fileWriter.write(dataObj);

                });
            });

        },
        createDirAndReturnEntry : function(_path, _create = true)
        {
            console.log("createDirAndReturnEntry>>>" + _path);
            console.log("_Create???>>>" + _create);
            return new Promise( (resolve, reject) => {
                window.requestFileSystem(
                    LocalFileSystem.PERSISTENT, 0,
                    function(fileSystem){
                        fileSystem.root.getDirectory(_path, { create: _create }, function(dirEntry){console.log("folder created>>>" + _path) ;resolve(dirEntry);
                    },
                    function(){
                        console.log("folder not created>>>>" + _path);resolve(0);});
                    },
                    function(){
                        console.log("Error creating a folder");console.log(evt.target.error.code);resolve(-1);
                });
            });
        },

        crearDir : function(_path, _create = true)
        {
            console.log("crearDir>>>" + _path);
            console.log("_Create???>>>" + _create);
            return new Promise( (resolve, reject) => {
                window.requestFileSystem(
                    LocalFileSystem.PERSISTENT, 0,
                    function(fileSystem){
                        fileSystem.root.getDirectory(_path, { create: _create }, function(dirEntry){console.log("folder created>>>" + _path) ;resolve(1);
                    },
                    function(){
                        console.log("folder not created>>>>" + _path);resolve(0);});
                    },
                    function(){
                        console.log("Error creating a folder");console.log(evt.target.error.code);resolve(-1);
                });
            });
        },
        setEstudios     : function()
        {
            console.log("setEstudios");
            return new Promise( (resolve, reject) => {

                self.estudiosMap.clear();
                self.estudiosList = [];
                self.leerArchivos(self.estudiosPath)
                .then(function(_myMap){
                    return new Promise( (resolve, reject) =>{
                        console.log("Saliendo de setEstudipos");
                        if( typeof _myMap != 'object'  || _myMap == null ) return;
                        let _counter = 0;
                        for (const [key, value] of _myMap.entries()){
                            $.ajax({
                                url:value, dataType : 'json',async : false,
                                success : function(data){
                                    console.log("Reading File");
                                    _counter++;
                                    //self.estudiosMap.set(key, {path:value, data:data});
                                    self.estudiosMap.set(key, data);
                                    self.estudiosList.push(data);
                                    if(_counter  >= _myMap.size ) resolve(1);
                                },
                                error: function(XMLHttpRequest, textStatus, errorThrown) {
                                    _counter++
                                    console.log("Status: " + textStatus); alert("Error: " + errorThrown);
                                    if(_counter  >= _myMap.size ) resolve(1);
                                }
                            });
                        }
                    })
                })
                .then(function(){
                    console.log("setEstudios OKKK");
                    console.log(self.estudiosMap.size);
                    resolve(1)
                })
            })
        },
        setCampanias     : function(_path)
        {
            console.log("setCampanias");
            return new Promise( (resolve, reject) => {
                console.log("Entrando a setCampanias" + _path);
                self.campaniasMap.clear();
                self.campaniasList = [];
                let _ok = false;
                self.leerArchivos(_path)
                .then(function(_myMap){
                    return new Promise( (resolve, reject) =>{
                        if( typeof _myMap != 'object'  || _myMap == null || _myMap.size < 1 ) {resolve(1); return;};
                        let _counter = 0;
                        for (const [key, value] of _myMap.entries()){
                            console.log("VALUE:::");
                            console.log(value);
                            $.ajax({
                                url:value, dataType : 'json',async : false,
                                success : function(data){
                                    _counter++;
                                    if(data.artifact != null)
                                    {
                                        self.campaniasMap.set(key, data);
                                        self.campaniasList.push(data);
                                    }
                                    if(_counter  >= _myMap.size ) resolve(1);
                                },
                                error: function(XMLHttpRequest, textStatus, errorThrown) {
                                    _counter++;
                                    console.log(JSON.stringify(textStatus));
                                    console.log(JSON.stringify(errorThrown));
                                    console.log("Status: " + textStatus);
                                    //alert("Error: " + errorThrown);
                                    if(_counter  >= _myMap.size ) resolve(1);
                                }
                            });
                        }
                    })
                })
                .then(function(){
                    console.log("setCampanias OKKK");
                    resolve(1)
                })
            })
        },
        doLogin:    function(_params)
        {
            console.log("doLogin");
            return new Promise( (resolve, reject) => {
                let _body = {};
                _body.username = _params.username;
                _body.password = _params.password;
                self.restClient.post("login",_body)
                .then((_response) =>{
                    console.log(JSON.stringify(_response));
                    resolve(_response.response);
                })
            });

        },
        obtenerArtifacts : function()
        {
            console.log("obtenerArtifacts");
            return new Promise( (resolve, reject) => {
                self.restClient.get("artifact/getAll")
                .then((_response) =>{
                    if(_response.id > 0) return _response.response;
                    return null;
                })
                .then(_crearArtifacts)
                .then(function(_result){
                    console.log("Saliendo del for artifacts>>>>" + _result);
                    resolve(1);
                })
                .catch(function(error){
                    console.log("error FETCHING>>>>>>>>");
                    console.log(error);
                });
            });
           function _crearArtifacts(_data){
               console.log("crearArtifacts");
               return new Promise( (resolve, reject) =>{
                   if(!_data ||  _data.length < 1){resolve(-1);return;}
                   for(let next = 0; next < _data.length; next++){
                       if(self.artifactCampaignMap.get(_data[next].id) && self.artifactCampaignMap.get(_data[next].id).length > 0 )
                       {
                           let _campaigns =  self.artifactCampaignMap.get(_data[next].id);
                           for(let next2 = 0; next2 < _campaigns.length; next2++){
                               if( _campaigns[next2].artifact != null )
                               {
                                   if( next >=  _data.length - 1 ) resolve(1);
                                   continue;
                               }
                               _campaigns[next2].artifact = _data[next];
                               self.saveFile(_campaigns[next2].pathInDevice, _campaigns[next2], true)
                               .then(function(_result){
                                   if(next2 >= (_campaigns.length - 1) &&  next >=  (_data.length - 1) ){ console.log("Retornando .....");resolve(1)};
                               },function(_error){
                                   if(next2 >= (_campaigns.length - 1) &&  next >=  (_data.length - 1) ){ console.log("Retornando .....");resolve(-1)};
                               })
                               .catch(function(error){
                                   console.log("error>>>>>>>>");
                                   console.log(error);
                               });
                           }
                       }
                   }

                })
            }
        },
        obtenerCampanias : function()
        {
            console.log("obtenerCampanias");
            self.artifactCampaignMap.clear();
            return new Promise( (resolve, reject) => {
                self.restClient.get("campaign/getAll")
                .then((_response) =>{
                    if(_response.id > 0) return _response.response;
                    return null;
                })
                .then(_crearCampanias)
                .then(function(_result){
                    console.log("Saliendo del for comapnias>>>>" + _result);
                    resolve(1);
                })
                .catch(function(error){
                    console.log("error FETCHING>>>>>>>>");
                    console.log(error);
                });
            });


            function createCampania(_campania)
            {
                return new Promise( (resolve, reject) =>{
                    let _filePath = null;
                    let _dirname = self.estudiosPath + "/" + _campania.researchId;
                    self.dirExists(_dirname)
                    .then((_exist)=>{
                        if(!_exist){
                            Promise.reject(-2);
                        }
                        Promise.resolve(1);
                    })
                   .then(function(_result){
                        _dirname = _dirname + "/campanias";
                        return self.saveDir(_dirname);
                   })
                   .then((_result)=>{
                       _dirname = _dirname + "/" + _campania.id;
                       return self.saveDir(_dirname)
                   })
                   .then((_result)=>{
                      _filePath = _dirname + "/" + _campania.id + ".json";
                      _campania.pathInDevice = _filePath;
                      return self.saveFile(_filePath, _campania);
                   })
                   .then(function(_result) {console.log("Diciendo TRUE");  resolve(1);})
                   .catch(function (error) {console.log("2-Error>>>>" + error);console.log(error.message);resolve(-1);});
               })
            }

           function _crearCampanias(_data){
               console.log("crearCampanias");
               return new Promise( (resolve, reject) =>{
                   if(!_data ||  _data.length < 1){resolve(-1);return;}
                   for(let next = 0; next < _data.length; next++){
                       if(! self.artifactCampaignMap.get(_data[next].artifactId) ) self.artifactCampaignMap.set(_data[next].artifactId, []);
                       createCampania(_data[next])
                       .then(function(_result){
                           console.log("_okkkk>>>>" + next);
                           _data[next].artifact = null;
                           //self.artifactCampaignMap.set(_data[next].artifactId, _data[next]);
                           self.artifactCampaignMap.get(_data[next].artifactId).push(_data[next]);
                           if(next >= (_data.length - 1)) resolve(1);
                       },function(_error){
                           console.log("_okkkkkkk2>>>>" + next);
                           if(next >= (_data.length - 1)) resolve(1);
                       });
                   }
                })
            }
        },
        obtenerEstudios : function()
        {
            console.log("obtenerEstudios");
            return new Promise( (resolve, reject) => {
                self.restClient.get("research/getAll")
                .then((_response) =>{
                    if(_response.id > 0) return _response.response;
                    return null;
                })
                .then(_crearEstudios)
                .then(function(_result){
                    console.log("Saliendo del for"); console.log(_result);
                    resolve(1);
                })
                .catch(function(error){
                    console.log("error FETCHING>>>>>>>>");
                    console.log(error);
                });
            });

            function _crearEstudios(_data)
            {
                console.log("crearEstudios");
                return new Promise( (resolve, reject) => {
                if(!_data){resolve(-1);return;}
                let _ok = 0;
                for(let next = 0; next < _data.length; next++)
                {
                    let _dirname = self.estudiosPath + "/" + _data[next].id;
                    self.crearDir(_dirname, false)
                    .then(  function(_result){
                                return new Promise( (resolve, reject) => {
                                    if(_result == 1){
                                         //Directorio ya existe
                                        console.log("Dir Already Exist");
                                        let _filePath = _dirname + "/" + _data[next].id + ".json";
                                        self.crearArchivo(_filePath, false)
                                        .then(  function(_result) {
                                                    console.log("_filePath >>>>>><" + _filePath)
                                                    console.log("RESUKT >>>>>><" + _result)
                                                    //No existe
                                                    if(_result == 0 ) {
                                                        //Grabamos el archivo de estudio
                                                        self.crearArchivo(_filePath).
                                                        then(
                                                            function(_result){
                                                                self.escribirArchivo(_result, JSON.stringify(_data[next]), false)
                                                                .then(  function(_result){console.log("GRABADA DATA EN FILE????");resolve(1);},
                                                                        function(_error){console.log("EROROR GRABANDO Data en file" + _error );resolve(0);});
                                                            }

                                                        )
                                                        console.log("checking file result 1"); resolve(1);
                                                    }
                                                    // Error
                                                    else if(_result == -1 ) {console.log("checking file Error");resolve(-1);}
                                                    else if(_result){console.log("Ya existe, no hacemos nada");resolve(1);}
                                                },
                                                function(_error){ console.log( "File Not Created>>>" + _error);resolve(-1);})
                                    }
                                    else if(_result == 0){
                                        console.log("Does Not Exist");
                                        //se genera directorio para el estudio  y se graba el archivo de estudio
                                        self.crearDir(_dirname)
                                        .then(  function(_result){
                                                    let _filePath = _dirname + "/" + _data[next].id + ".json";
                                                    self.crearArchivo(_filePath)
                                                    .then(  function(_result){
                                                                self.escribirArchivo(_result, JSON.stringify(_data[next]), false)
                                                                .then(  function(_result){console.log("GRABADA DATA EN FILE????"); resolve(1);},
                                                                        function(_error){console.log("EROROR GRABANDO Data en file" + _error ); resolve(0);});
                                                            },
                                                            function(_error){console.log( "File Not Created>>>" + _error); resolve(-1);})
                                                });
                                    }
                                })
                            })
                        .then(function(_result) { _ok++;if(_ok >= _data.length) resolve(1);})
                    }
                })
            }
        },
        crearEstructura: function(_dirPath)
        {
            console.log("creando directorios");
            return new Promise( (resolve, reject) =>{
                let _ok = false;
                self.crearDir(_dirPath, false)
                .then(function(_result){
                    return new Promise( (resolve, reject) =>{
                        if(_result == 1){
                            console.log("Already Exist>>>>" + _dirPath);
                            resolve(1);
                        }
                        else if(_result == 0){
                            console.log("Does not Exist>>>>" + _dirPath);
                            self.crearDir(_dirPath)
                            .then(  function(_result){
                                        self.crearDir(self.estudiosPath  )
                                        .then(  function(_result){console.log("result OK>>" + _result); resolve(1);},
                                                function(_result){console.log("Error Not OK>>" + _result);  resolve(-1);
                                        })
                                    },
                                    function(_error){
                                        console.log("Error>>>>>" + _error);
                                        resolve(-1);})
                            .then(function(_result){
                                self.crearDir(self.unsentPath)
                                .then(  function(_result){
                                    console.log("self.unsentPath>>>>>" + _result);
                                    resolve(1);
                                 })
                            })
                            .then(function(_result){
                                self.crearDir(self.sentPath)
                                .then(  function(_result){
                                    console.log("self.sentPath>>>>>" + _result);
                                    resolve(1);
                                 })
                            })
                        }
                    })
                })
                .then(function(_result){
                    resolve(1)
                })
            });
        },
        saveFile:   function(_path, _content, _override = false )
        {
            return new Promise( (resolve, reject) =>{
                self.fileExists(_path)
                .then((_exist)=>{
                    if(!_exist ){
                        self.crearArchivo(_path)
                        .then((_fileEntry)=>{
                            self.escribirArchivo(_fileEntry, JSON.stringify(_content), false)
                            .then(function(_result){
                                resolve(_result)
                            })
                        })
                    }
                    else{
                        if(_override )  self.escribirArchivo(_fileEntry, JSON.stringify(_content), false)
                                        .then((_result) =>{resolve(_result)});
                        else reject(1);
                    }

                })

            })
        },
        saveDir:    function(_path)
        {
            return new Promise( (resolve, reject) =>{
                self.dirExists(_path)
                .then((_exist)=>{
                    if(!_exist){
                        self.crearDir(_path)
                        .then(function(_result){
                            console.log("_result>>>>" + _result);
                            if(_result == 1 ) resolve(1);
                            else reject(_result)

                        },function(_error){
                            reject(_result)
                        });
                        //return Promise.reject(-2);
                    }
                    else resolve(1);
                })
            })
        },
        dirExists:  function(_path)
        {
            console.log("dirExists>>>>" + _path);
            return new Promise( (resolve, reject) =>{
                self.crearDir(_path, false)
                .then( (_result) =>{
                        console.log("Resturn>>>" + _result);
                         if(_result == 1) resolve(true);
                         else resolve(false);
                     })
            })

        },
        fileExists: function(_path)
        {
            console.log("FileExists>>>>" + _path);
            return new Promise( (resolve, reject) =>{
                self.crearArchivo(_path, false)
                .then( (_result) =>{
                        console.log("Resturn>>>" + _result);
                         if(_result == 1) resolve(true);
                         else resolve(false);
                     })
            })
        }

    };
    // let _params = {userId:2001};
    // fileHandler.initialize(_params);
