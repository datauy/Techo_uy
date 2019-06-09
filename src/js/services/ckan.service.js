pmb_im.services.factory('CkanService', ['$http', 'leafletData','ConfigService', function($http, leafletData, ConfigService) {

  var CkanServiceObj = {};
  CkanServiceObj.lastPinsResponse = null;
  CkanServiceObj.asentamientosActivos = null;
  CkanServiceObj.filtrosActivos = null;
  CkanServiceObj.lastLoadedDataYear = null;
  CkanServiceObj.rids = new Array();
  CkanServiceObj.rids["2018"] = "ce78951d-6ad2-4e1c-8fa6-9d42d04115c0";
  CkanServiceObj.rids["2011"] = "bd962338-cb7f-470e-864c-162a4d3c4ba4";

  CkanServiceObj.departamentos = {
    1 : "Montevideo",
    2 : "Artigas",
    3 : "Canelones",
    4 : "Cerro Largo",
    5 : "Colonia",
    6 : "Durazno",
    7 : "Flores",
    8 : "Florida",
    9 : "Lavalleja",
    10 : "Maldonado",
    11 : "Paysandú",
    12 : "Río Negro",
    13 : "Rivera",
    14 : "Rocha",
    15 : "Salto",
    16 : "San José",
    17 : "Soriano",
    18 : "Tacuarembó",
    19 : "Treinta y Tres",
  };

  CkanServiceObj.getAllPolygons = function () {
      return $http.get(ConfigService.ckanAllPolygonsURL, { headers: {'Authorization': 'd7e78b6e-3eed-4d69-8387-ab0196121a51'} }).then(function (response) {
        return response.data.result.records;
      });
  };

  CkanServiceObj.getPolygonsById = function (ids) {
      //return $http.get(ConfigService.ckanSQL, { headers: {'Authorization': 'd7e78b6e-3eed-4d69-8387-ab0196121a51'} });
      var activePolygons = [];
      return $http.get('polygons.json').then(function (response) {
        for (var i = 0; i < response.data.length; i++) {
          var agregar = 1;
          if(ids.indexOf( parseInt(response.data[i]['COD_AST']) ) != -1){
            activePolygons.push(response.data[i]);
          }
        }
        return activePolygons;
      });
  }

  CkanServiceObj.getData = function (filters) {
    var query = "SELECT * from ";
    if (filters.a_o && filters.a_o.uno) {
      CkanServiceObj.lastLoadedDataYear = "2011";
      query += '"'+CkanServiceObj.rids["2011"]+'" ';
      //removemos campos que no están // TODO: inhabilitar los filtros
      if(filters.hasOwnProperty('tipo')) delete filters.tipo;
      if(filters.hasOwnProperty('vivendas_no')) delete filters.vivendas_no;
      if(filters.hasOwnProperty('p_techos_prec')) delete filters.p_techos_prec;
      if(filters.hasOwnProperty('p_paredes_prec')) delete filters.p_paredes_prec;
      if(filters.hasOwnProperty('p_contelect')) delete filters.p_contelect;
      if(filters.hasOwnProperty('p_c_drenaje')) delete filters.p_c_drenaje;
    }
    else {
      //Fallback 2018
      CkanServiceObj.lastLoadedDataYear = "2018";
      query += '"'+CkanServiceObj.rids["2018"]+'" ';
    }
    if ( filters.depto == '0') {
      delete filters.depto;
    }
    if(filters.hasOwnProperty('a_o')) delete filters.a_o;
    // TODO: Ver que haya filtros o devolver todo
    if (Object.keys(filters).length) {
      query += 'where ';
      queryArr = [];
      var asentamientosActivos = [];
      for( var filterGroup in filters ){
        if(!filters.hasOwnProperty(filterGroup)) continue;
        switch (filterGroup) {
          case 'tipo':
            if (filters.tipo.urbano && filters.tipo.rural ) continue;
            // TODO: Agregar campo a planilla
            else if (filters.tipo.urbano) queryArr.push("tipo_asentamiento = 1");
            else if (filters.tipo.rural) queryArr.push("tipo_asentamiento = 2");
          break;
          case 'depto':
            queryArr.push("depto = "+filters.depto);
          break;
          case 'vivendas_no':
            var viviArr = [];
            if (filters[filterGroup].uno) viviArr.push("nro_viviendas <= 50");
            if (filters[filterGroup].dos) viviArr.push("nro_viviendas > 50 AND nro_viviendas <= 100");
            if (filters[filterGroup].tres) viviArr.push("nro_viviendas > 100 AND nro_viviendas <= 200");
            if (filters[filterGroup].cuatro) viviArr.push("nro_viviendas > 200");
            queryArr.push(viviArr.join(' OR '));
            break;
          case 'p_techos_prec':
          case 'p_paredes_prec':
          case 'vivendas_suelos':
          case 'p_contelect':
          case 'p_c_drenaje':
          case 'p_acera_materiales':
          case 'p_calle_materiales':
            var pArr = [];
            if (filters[filterGroup].cuarenta) pArr.push(filterGroup+" <= 40");
            if (filters[filterGroup].sesenta) pArr.push(filterGroup+" > 40 AND 60 <= "+filterGroup);
            if (filters[filterGroup].cien) pArr.push(filterGroup+" > 60");
            queryArr.push(pArr.join(' OR '));
            break;
          case 'alumbrado_asent':
          case 'basural_asent':
          case 'parada_asent':
          case 'placas_asent':
            queryArr.push(filterGroup+" = 1");
          break;
          case 'arbolado':
            if (filters.arbolado.cincuenta && filters.arbolado.cien ) continue;
            // TODO: Agregar campo a planilla
            else if (filters.arbolado.cincuenta) queryArr.push("arbolado_asent = 0");
            else if (filters.arbolado.cien) queryArr.push("arbolado_asent >= 1");
          break;
        }
      }
      query += queryArr.join(' AND ');
    }
    filters.a_o = {uno: false, ocho: false};
    if(CkanServiceObj.lastLoadedDataYear=="2011"){
      filters.a_o.uno = true;
    }else{
      filters.a_o.ocho = true;
    }
    //var resp = $http.post(ConfigService.ckanSQL, { headers: {'Authorization': 'd7e78b6e-3eed-4d69-8387-ab0196121a51'} });
    return $http.post('/ckanSql', {sql: query}).then(function (response) {
      /*for (var i = 0; i < response.data.length; i++) {
        var agregar = 1;
        var ast = response.data[i];
        if (query.tipo_asentamiento && query.tipo_asentamiento != ast.tipo_asentamiento) {
          agregar = 0;
        }
        //otros Filtros

        if (agregar) asentamientosActivos.push(ast);
        console.log(asentamientosActivos);
      }*/
      return response.data.result.records;
    });
  };

  CkanServiceObj.getDataById = function (id2018) {
    console.log('DATA BY ID:'+ id2018);
      var url = '/ckanData';
      var params = {
        resource_id: CkanServiceObj.rids["2011"],
        limit:1,
        q: id2018,
      };
      console.log(params);
      return $http.get(url, {"params": params, cache: false}).then(function (response) {
        console.log("termina POST");
        console.log(response.data.result.records[0]);
        return response.data.result.records[0];
      });
  };

  CkanServiceObj.getAllData = function (year) {
    var rid = CkanServiceObj.rids[year];
    CkanServiceObj.lastLoadedDataYear = year;
      var url = '/ckanData';
      return $http.post(url, { resource_id: rid, limit: 800 }).then(function (response) {
        return response.data.result.records;
      });
  };

  CkanServiceObj.queryData = function (query) {
    console.log('DATABYQUERY');
    return $http.post('/ckanSql', {sql: query}).then(function (response) {
      console.log('BYQUERY');
      console.log(response);
      return response.data.result.records;
    });
  };
  return CkanServiceObj;
}]);
