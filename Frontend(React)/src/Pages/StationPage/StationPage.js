import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---- amCharts 4 ----
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4themes_animated from '@amcharts/amcharts4/themes/animated';

// Aplicamos el tema animado de amCharts 4
am4core.useTheme(am4themes_animated);

// ---- amCharts 5 (para el globo terráqueo) ----
import * as am5 from '@amcharts/amcharts5';
import * as am5map from '@amcharts/amcharts5/map';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';

// Iconos de Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Ajustamos la ruta de los iconos para que no aparezcan rotos
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Importar SunCalc
import SunCalc from 'suncalc';

import PageTitle from '../../components/PageTitle/PageTitle';
import './StationPage.css';

const Station = () => {
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);

  // State principal
  const initialSerial = query.get('serial_number') || '';
  const [serialNumber, setSerialNumber] = useState(initialSerial);
  const [fecha, setFecha] = useState(query.get('fecha') || '');
  const [hora, setHora] = useState(query.get('hora') || '');

  const [infoEstacion, setInfoEstacion] = useState(null);
  const [estadoEstacion, setEstadoEstacion] = useState('');
  const [currentTemperature, setCurrentTemperature] = useState(null);
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [tempMax, setTempMax] = useState(null);
  const [tempMin, setTempMin] = useState(null);
  const [humMax, setHumMax] = useState(null);
  const [humMin, setHumMin] = useState(null);
  const [datosEstacion, setDatosEstacion] = useState([]);

  // Alerta
  const [alerta, setAlerta] = useState(null);

  // Estado para el mapa Leaflet
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [map, setMap] = useState(null);

  // Nuevos estados para las horas de sol
  const [sunriseTime, setSunriseTime] = useState('--:--');
  const [sunsetTime, setSunsetTime] = useState('--:--');

  // Referencias a los gráficos (para destruirlos al recargar datos)
  const chartTempRef = useRef(null);
  const chartHumRef = useRef(null);

  // Referencia para el globo de “Horas Sol” (amCharts 5)
  const chartSunRef = useRef(null);

  // Referencias para los gauges
  const gaugeTempRef = useRef(null);
  const gaugeHumRef = useRef(null);

  // ==============================
  // PRONÓSTICO DE OPENWEATHER
  // ==============================
  // Estado para almacenar los datos devueltos por OpenWeather
  const [forecastData, setForecastData] = useState(null);

  // Estado para el rango de pronóstico seleccionado ("3h", "24h", "5d")
  const [forecastRange, setForecastRange] = useState('24h');

  // Estado para la precipitación acumulada en el rango
  const [accumulatedPrecip, setAccumulatedPrecip] = useState(0);

  // Referencia para el gauge de precipitación
  const gaugePrecipRef = useRef(null);

  // Estados para controlar los acordeones
  const [isFechaHoraOpen, setIsFechaHoraOpen] = useState(true);
  const [isDatosOpen, setIsDatosOpen] = useState(true);

  /**
   * Convierte un timestamp en formato "YYYY-MM-DD HH:mm:ss" (UTC)
   * a la hora local de la estación.
   */
  function formatLocalTimestamp(timestampUTC, stationTz) {
    if (!timestampUTC) return '';
    const date = new Date(timestampUTC + 'Z');
    return date.toLocaleString('es-ES', {
      timeZone: stationTz || 'UTC',
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  }

  /**
   * Llamada al endpoint /api/estacion.php para obtener la información
   * y los datos de la estación.
   */
  const cargarDatos = async () => {
    try {
      let url = `/api/estacion.php?serial_number=${encodeURIComponent(serialNumber)}`;
      if (fecha) url += `&fecha=${encodeURIComponent(fecha)}`;
      if (hora) url += `&hora=${encodeURIComponent(hora)}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setInfoEstacion(data.infoEstacion);
        setEstadoEstacion(data.estadoEstacion);
        setCurrentTemperature(data.currentTemperature);
        setCurrentHumidity(data.currentHumidity);
        setTempMax(data.tempMax);
        setTempMin(data.tempMin);
        setHumMax(data.humMax);
        setHumMin(data.humMin);
        setDatosEstacion(data.datosEstacion);

        // Guardamos lat y long para el mapa
        setLatitude(data.latitude);
        setLongitude(data.longitude);

        setAlerta(null);
      } else if (response.status === 401) {
        // Usuario no autenticado, redirigir a login
        navigate('/login');
      } else {
        setAlerta({
          tipo: 'danger',
          texto: data.message || 'No se pudieron cargar los datos de la estación.'
        });
      }
    } catch (error) {
      setAlerta({ tipo: 'danger', texto: error.message });
    }
  };

  // Efecto para cargar datos de la estación cuando cambian serialNumber, fecha u hora
  useEffect(() => {
    if (serialNumber) {
      cargarDatos();
    }
    // eslint-disable-next-line
  }, [serialNumber, fecha, hora]);

  // Efecto para ocultar la alerta tras 5 segundos
  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  // Inicializar/actualizar mapa Leaflet cuando tenemos lat/long
  useEffect(() => {
    if (latitude && longitude) {
      if (!map) {
        // Crear un mapa por primera vez
        const newMap = L.map('map-leaflet').setView([latitude, longitude], 13);

        // Capa base (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(newMap);

        // Añadir marcador
        L.marker([latitude, longitude]).addTo(newMap);

        // Guardar la referencia en el state
        setMap(newMap);
      } else {
        // Si el mapa ya existe, solo muevo la vista
        map.setView([latitude, longitude], 13);
        L.marker([latitude, longitude]).addTo(map);
      }
    }
  }, [latitude, longitude, map]);

  /**
   * Manejar el envío del formulario: cambiamos la URL con los params,
   * y React Router recargará el componente con esos valores.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('serial_number', serialNumber);
    if (fecha) params.set('fecha', fecha);
    if (hora) params.set('hora', hora);

    navigate(`/estacion?${params.toString()}`);
  };

  // ======================================================
  //  1) Llamar a OpenWeather con las coordenadas de la estación
  // ======================================================
  useEffect(() => {
    // Solo llamamos al servidor PHP si tenemos lat y lon
    if (!latitude || !longitude) return;

    const fetchPrecipitaciones = async () => {
      try {
        const response = await fetch('api/get-weather.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude,
            longitude,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('Error al obtener los datos:', data.error);
          setForecastData(null);  
        } else {
          setForecastData(data);  
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
      }
    };

    fetchPrecipitaciones();
  }, [latitude, longitude]);  // Vuelve a ejecutar el efecto si las coordenadas cambian

  // ======================================================
  //  2) Calcular la precipitación acumulada según forecastRange
  //     (3 horas, 24 horas o 5 días [máx. 5 días que da la API]).
  // ======================================================
  useEffect(() => {
    if (!forecastData || !forecastData.list) {
      setAccumulatedPrecip(0);
      return;
    }

    let sum = 0;
    let intervalsNeeded = 0;

    // Cada intervalo de "list" son 3 horas. 
    // - 3h -> 1 intervalo
    // - 24h -> 8 intervalos (8 x 3 = 24)
    // - 5d -> ~40 intervalos (la API da 5 días, 3h c/u => 8 x 5 = 40)
    switch (forecastRange) {
      case '3h':
        intervalsNeeded = 1;
        break;
      case '24h':
        intervalsNeeded = 8;
        break;
      case '5d':
        intervalsNeeded = forecastData.list.length; // normalmente 40
        break;
      default:
        intervalsNeeded = 8; // fallback
    }

    for (let i = 0; i < intervalsNeeded && i < forecastData.list.length; i++) {
      sum += forecastData.list[i].rain?.['3h'] ?? 0;
    }

    setAccumulatedPrecip(sum);
  }, [forecastData, forecastRange]);

  // ======================================================
  //  3) Construir/Actualizar todos los gráficos amCharts 4 y 5
  // ======================================================
  useEffect(() => {
    // Si no hay datos de la estación, destruir gráficos si existen.
    if (!datosEstacion || datosEstacion.length === 0) {
      if (chartTempRef.current) {
        chartTempRef.current.dispose();
        chartTempRef.current = null;
      }
      if (chartHumRef.current) {
        chartHumRef.current.dispose();
        chartHumRef.current = null;
      }
      if (chartSunRef.current) {
        chartSunRef.current.dispose();
        chartSunRef.current = null;
      }
      if (gaugeTempRef.current) {
        gaugeTempRef.current.dispose();
        gaugeTempRef.current = null;
      }
      if (gaugeHumRef.current) {
        gaugeHumRef.current.dispose();
        gaugeHumRef.current = null;
      }
      if (gaugePrecipRef.current) {
        gaugePrecipRef.current.dispose();
        gaugePrecipRef.current = null;
      }
      return;
    }

    // Destruir instancias previas para evitar fugas de memoria
    if (chartTempRef.current) chartTempRef.current.dispose();
    if (chartHumRef.current) chartHumRef.current.dispose();
    if (chartSunRef.current) {
      chartSunRef.current.dispose();
      chartSunRef.current = null;
    }
    if (gaugeTempRef.current) gaugeTempRef.current.dispose();
    if (gaugeHumRef.current) gaugeHumRef.current.dispose();
    if (gaugePrecipRef.current) gaugePrecipRef.current.dispose();

    // ---- Preparar datos para los gráficos de amCharts 4 (Temp y Hum) ----
    const chartData = datosEstacion.map(dato => ({
      timestamp: new Date(dato.timestamp + 'Z'),
      temperature: Number(dato.temperature),
      humidity: Number(dato.humidity)
    }));

    // ======================================================
    //   GRÁFICO DE TEMPERATURA (amCharts 4)
    // ======================================================
    const chartTemp = am4core.create('graficoTemperatura', am4charts.XYChart);
    chartTemp.data = chartData;
    if (infoEstacion?.timezone) {
      chartTemp.dateFormatter.timezone = infoEstacion.timezone;
    }

    // Eje X (fecha-hora)
    const dateAxisTemp = chartTemp.xAxes.push(new am4charts.DateAxis());
    dateAxisTemp.title.text = 'Fecha y Hora';
    dateAxisTemp.tooltipDateFormat = 'dd/MM/yyyy HH:mm:ss';

    // Eje Y (temperatura)
    const valueAxisTemp = chartTemp.yAxes.push(new am4charts.ValueAxis());
    valueAxisTemp.title.text = 'Temperatura (°C)';
    valueAxisTemp.min = -20;
    valueAxisTemp.max = 80;
    valueAxisTemp.baseValue = -20;

    // Serie de Temperatura
    const seriesTemp = chartTemp.series.push(new am4charts.LineSeries());
    seriesTemp.dataFields.valueY = 'temperature';
    seriesTemp.dataFields.dateX = 'timestamp';
    seriesTemp.name = 'Temperatura (°C)';
    seriesTemp.strokeWidth = 2;
    seriesTemp.tooltipText = '{valueY} °C';
    seriesTemp.stroke = am4core.color('rgba(255, 99, 132, 1)');
    seriesTemp.fillOpacity = 0.2;
    seriesTemp.fill = am4core.color('rgba(255, 99, 132, 0.2)');

    // Cursor para hover
    chartTemp.cursor = new am4charts.XYCursor();
    chartTemp.cursor.xAxis = dateAxisTemp;

    // Líneas de referencia (Temp Max/Min)
    if (tempMax != null) {
      const rangeMaxTemp = valueAxisTemp.axisRanges.create();
      rangeMaxTemp.value = tempMax;
      rangeMaxTemp.grid.stroke = am4core.color('rgba(255, 0, 0, 0.7)');
      rangeMaxTemp.grid.strokeWidth = 2;
      rangeMaxTemp.label.inside = true;
      rangeMaxTemp.label.text = 'Temp Max';
      rangeMaxTemp.label.fill = am4core.color('#FF0000');
      rangeMaxTemp.label.verticalCenter = 'bottom';
    }
    if (tempMin != null) {
      const rangeMinTemp = valueAxisTemp.axisRanges.create();
      rangeMinTemp.value = tempMin;
      rangeMinTemp.grid.stroke = am4core.color('rgba(0, 0, 255, 0.7)');
      rangeMinTemp.grid.strokeWidth = 2;
      rangeMinTemp.label.inside = true;
      rangeMinTemp.label.text = 'Temp Min';
      rangeMinTemp.label.fill = am4core.color('#0000FF');
      rangeMinTemp.label.verticalCenter = 'top';
    }

    chartTempRef.current = chartTemp;

    // ======================================================
    //   GRÁFICO DE HUMEDAD (amCharts 4)
    // ======================================================
    const chartHum = am4core.create('graficoHumedad', am4charts.XYChart);
    chartHum.data = chartData;
    if (infoEstacion?.timezone) {
      chartHum.dateFormatter.timezone = infoEstacion.timezone;
    }

    // Eje X (fecha-hora)
    const dateAxisHum = chartHum.xAxes.push(new am4charts.DateAxis());
    dateAxisHum.title.text = 'Fecha y Hora';
    dateAxisHum.tooltipDateFormat = 'dd/MM/yyyy HH:mm:ss';

    // Eje Y (humedad)
    const valueAxisHum = chartHum.yAxes.push(new am4charts.ValueAxis());
    valueAxisHum.title.text = 'Humedad (%)';
    valueAxisHum.min = 0;
    valueAxisHum.max = 100;

    // Serie de Humedad
    const seriesHum = chartHum.series.push(new am4charts.LineSeries());
    seriesHum.dataFields.valueY = 'humidity';
    seriesHum.dataFields.dateX = 'timestamp';
    seriesHum.name = 'Humedad (%)';
    seriesHum.strokeWidth = 2;
    seriesHum.tooltipText = '{valueY} %';
    seriesHum.stroke = am4core.color('rgba(54, 162, 235, 1)');
    seriesHum.fillOpacity = 0.2;
    seriesHum.fill = am4core.color('rgba(54, 162, 235, 0.2)');

    // Cursor para hover
    chartHum.cursor = new am4charts.XYCursor();
    chartHum.cursor.xAxis = dateAxisHum;

    // Líneas de referencia (Hum Max/Min)
    if (humMax != null) {
      const rangeMaxHum = valueAxisHum.axisRanges.create();
      rangeMaxHum.value = humMax;
      rangeMaxHum.grid.stroke = am4core.color('rgba(255, 0, 0, 0.7)');
      rangeMaxHum.grid.strokeWidth = 2;
      rangeMaxHum.label.inside = true;
      rangeMaxHum.label.text = 'Hum Max';
      rangeMaxHum.label.fill = am4core.color('#FF0000');
      rangeMaxHum.label.verticalCenter = 'bottom';
    }
    if (humMin != null) {
      const rangeMinHum = valueAxisHum.axisRanges.create();
      rangeMinHum.value = humMin;
      rangeMinHum.grid.stroke = am4core.color('rgba(0, 0, 255, 0.7)');
      rangeMinHum.grid.strokeWidth = 2;
      rangeMinHum.label.inside = true;
      rangeMinHum.label.text = 'Hum Min';
      rangeMinHum.label.fill = am4core.color('#0000FF');
      rangeMinHum.label.verticalCenter = 'top';
    }

    chartHumRef.current = chartHum;

    // ======================================================
    //   GLOBO DÍA/NOCHE (amCharts 5) - “graficoHorasSol”
    // ======================================================
    const rootSun = am5.Root.new('graficoHorasSol');
    rootSun.setThemes([am5themes_Animated.new(rootSun)]);

    const chartSun = rootSun.container.children.push(
      am5map.MapChart.new(rootSun, {
        panX: 'rotateX',
        panY: 'rotateY',
        projection: am5map.geoOrthographic()
      })
    );

    const backgroundSeries = chartSun.series.push(am5map.MapPolygonSeries.new(rootSun, {}));
    backgroundSeries.mapPolygons.template.setAll({
      fill: rootSun.interfaceColors.get('alternativeBackground'),
      fillOpacity: 0,
      strokeOpacity: 0
    });
    backgroundSeries.data.push({
      geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    const polygonSeries = chartSun.series.push(
      am5map.MapPolygonSeries.new(rootSun, {
        geoJSON: am5geodata_worldLow
      })
    );

    const sunSeries = chartSun.series.push(am5map.MapPointSeries.new(rootSun, {}));
    // Halo
    sunSeries.bullets.push(() => {
      let circle = am5.Circle.new(rootSun, {
        radius: 18,
        fill: am5.color(0xffba00),
        filter: 'blur(5px)'
      });
      circle.animate({
        key: 'radius',
        duration: 2000,
        to: 23,
        loops: Infinity,
        easing: am5.ease.yoyo(am5.ease.linear)
      });
      return am5.Bullet.new(rootSun, { sprite: circle });
    });
    // Bolita
    sunSeries.bullets.push(() => {
      return am5.Bullet.new(rootSun, {
        sprite: am5.Circle.new(rootSun, {
          radius: 14,
          fill: am5.color(0xffba00)
        })
      });
    });

    const sunDataItem = sunSeries.pushDataItem({});

    const nightSeries = chartSun.series.push(am5map.MapPolygonSeries.new(rootSun, {}));
    nightSeries.mapPolygons.template.setAll({
      fill: am5.color(0x000000),
      fillOpacity: 0.25,
      strokeOpacity: 0
    });

    const nightDataItem0 = nightSeries.pushDataItem({});
    const nightDataItem1 = nightSeries.pushDataItem({});
    const nightDataItem2 = nightSeries.pushDataItem({});

    function updateDayNight(time) {
      let sunPos = solarPosition(time);
      sunDataItem.set('longitude', sunPos.longitude);
      sunDataItem.set('latitude', sunPos.latitude);

      let nightPos = {
        longitude: sunPos.longitude + 180,
        latitude: -sunPos.latitude
      };

      nightDataItem0.set('geometry', am5map.getGeoCircle(nightPos, 92));
      nightDataItem1.set('geometry', am5map.getGeoCircle(nightPos, 90));
      nightDataItem2.set('geometry', am5map.getGeoCircle(nightPos, 88));
    }

    updateDayNight(Date.now());

    chartSunRef.current = rootSun;

    function solarPosition(time) {
      let centuries = (time - Date.UTC(2000, 0, 1, 12)) / 864e5 / 36525;
      let longitude = ((am5.time.round(new Date(time), 'day', 1).getTime() - time) / 864e5) * 360 - 180;
      return am5map.normalizeGeoPoint({
        longitude: longitude - equationOfTime(centuries) * am5.math.DEGREES,
        latitude: solarDeclination(centuries) * am5.math.DEGREES
      });
    }

    function equationOfTime(centuries) {
      let e = eccentricityEarthOrbit(centuries);
      let m = solarGeometricMeanAnomaly(centuries);
      let l = solarGeometricMeanLongitude(centuries);
      let y = Math.tan(obliquityCorrection(centuries) / 2);
      y *= y;
      return (
        y * Math.sin(2 * l) -
        2 * e * Math.sin(m) +
        4 * e * y * Math.sin(m) * Math.cos(2 * l) -
        0.5 * y * y * Math.sin(4 * l) -
        1.25 * e * e * Math.sin(2 * m)
      );
    }

    function solarDeclination(centuries) {
      return Math.asin(
        Math.sin(obliquityCorrection(centuries)) *
          Math.sin(solarApparentLongitude(centuries))
      );
    }

    function solarApparentLongitude(centuries) {
      return (
        solarTrueLongitude(centuries) -
        (0.00569 +
          0.00478 *
            Math.sin((125.04 - 1934.136 * centuries) * am5.math.RADIANS)) *
          am5.math.RADIANS
      );
    }

    function solarTrueLongitude(centuries) {
      return solarGeometricMeanLongitude(centuries) + solarEquationOfCenter(centuries);
    }

    function solarGeometricMeanAnomaly(centuries) {
      return (
        (357.52911 + centuries * (35999.05029 - 0.0001537 * centuries)) *
        am5.math.RADIANS
      );
    }

    function solarGeometricMeanLongitude(centuries) {
      let l = (280.46646 + centuries * (36000.76983 + centuries * 0.0003032)) % 360;
      return ((l < 0 ? l + 360 : l) / 180) * Math.PI;
    }

    function solarEquationOfCenter(centuries) {
      let m = solarGeometricMeanAnomaly(centuries);
      return (
        (Math.sin(m) *
          (1.914602 - centuries * (0.004817 + 0.000014 * centuries)) +
          Math.sin(m + m) * (0.019993 - 0.000101 * centuries) +
          Math.sin(m + m + m) * 0.000289) *
        am5.math.RADIANS
      );
    }

    function obliquityCorrection(centuries) {
      return (
        meanObliquityOfEcliptic(centuries) +
        0.00256 *
          Math.cos((125.04 - 1934.136 * centuries) * am5.math.RADIANS) *
          am5.math.RADIANS
      );
    }

    function meanObliquityOfEcliptic(centuries) {
      return (
        (23 +
          (26 +
            (21.448 -
              centuries * (46.815 + centuries * (0.00059 - centuries * 0.001813))) /
              60) /
            60) *
        am5.math.RADIANS
      );
    }

    function eccentricityEarthOrbit(centuries) {
      return 0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);
    }

    // ======================================================
    //   CALCULAR HORAS DE SOL CON SunCalc
    // ======================================================
    if (latitude != null && longitude != null) {
      const times = SunCalc.getTimes(new Date(), latitude, longitude);
      const sunrise = times.sunrise;
      const sunset = times.sunset;
      const formatTime = (date) =>
        date.getHours().toString().padStart(2, '0') +
        ':' +
        date.getMinutes().toString().padStart(2, '0');

      setSunriseTime(formatTime(sunrise));
      setSunsetTime(formatTime(sunset));
    }

    // ======================================================
    //   GAUGES DE TEMPERATURA Y HUMEDAD (amCharts 4)
    // ======================================================
    // Temperatura
    const gaugeTemp = am4core.create('gaugeTemperatura', am4charts.GaugeChart);
    gaugeTemp.innerRadius = am4core.percent(82);

    const axisTemp = gaugeTemp.xAxes.push(new am4charts.ValueAxis());
    axisTemp.min = -20;
    axisTemp.max = 80;
    axisTemp.strictMinMax = true;

    const tempLowEnd = tempMin !== null ? tempMin : 0;
    const tempMidEnd = tempMax !== null ? tempMax : 50;

    const rangeTempLow = axisTemp.axisRanges.create();
    rangeTempLow.value = axisTemp.min;
    rangeTempLow.endValue = tempLowEnd;
    rangeTempLow.axisFill.fill = am4core.color('#0000FF');
    rangeTempLow.axisFill.fillOpacity = 1;

    const rangeTempMid = axisTemp.axisRanges.create();
    rangeTempMid.value = tempLowEnd;
    rangeTempMid.endValue = tempMidEnd;
    rangeTempMid.axisFill.fill = am4core.color('#00FF00');
    rangeTempMid.axisFill.fillOpacity = 1;

    const rangeTempHigh = axisTemp.axisRanges.create();
    rangeTempHigh.value = tempMidEnd;
    rangeTempHigh.endValue = axisTemp.max;
    rangeTempHigh.axisFill.fill = am4core.color('#FF0000');
    rangeTempHigh.axisFill.fillOpacity = 1;

    const handTemp = gaugeTemp.hands.push(new am4charts.ClockHand());
    handTemp.value = currentTemperature !== null ? currentTemperature : axisTemp.min;

    gaugeTempRef.current = gaugeTemp;

    // Humedad
    const gaugeHum = am4core.create('gaugeHumedad', am4charts.GaugeChart);
    gaugeHum.innerRadius = am4core.percent(82);

    const axisHum = gaugeHum.xAxes.push(new am4charts.ValueAxis());
    axisHum.min = 0;
    axisHum.max = 100;
    axisHum.strictMinMax = true;

    const humLowEnd = humMin !== null ? humMin : 30;
    const humMidEnd = humMax !== null ? humMax : 60;

    const rangeHumLow = axisHum.axisRanges.create();
    rangeHumLow.value = axisHum.min;
    rangeHumLow.endValue = humLowEnd;
    rangeHumLow.axisFill.fill = am4core.color('#0000FF');
    rangeHumLow.axisFill.fillOpacity = 1;

    const rangeHumMid = axisHum.axisRanges.create();
    rangeHumMid.value = humLowEnd;
    rangeHumMid.endValue = humMidEnd;
    rangeHumMid.axisFill.fill = am4core.color('#00FF00');
    rangeHumMid.axisFill.fillOpacity = 1;

    const rangeHumHigh = axisHum.axisRanges.create();
    rangeHumHigh.value = humMidEnd;
    rangeHumHigh.endValue = axisHum.max;
    rangeHumHigh.axisFill.fill = am4core.color('#FFFF00');
    rangeHumHigh.axisFill.fillOpacity = 1;

    const handHum = gaugeHum.hands.push(new am4charts.ClockHand());
    handHum.value = currentHumidity !== null ? currentHumidity : axisHum.min;

    gaugeHumRef.current = gaugeHum;

    // ======================================================
    //   GAUGE DE PRECIPITACIÓN (amCharts 4)
    // ======================================================
    const gaugePrecip = am4core.create('gaugePrecipitacion', am4charts.GaugeChart);
    gaugePrecip.innerRadius = am4core.percent(82);

    const axisPrecip = gaugePrecip.xAxes.push(new am4charts.ValueAxis());
    axisPrecip.min = 0;
    axisPrecip.max = 50; // Ajusta el máximo a lo que consideres razonable
    axisPrecip.strictMinMax = true;

    // Rango "bajo" de precipitación
    const rangePrecipLow = axisPrecip.axisRanges.create();
    rangePrecipLow.value = 0;
    rangePrecipLow.endValue = 10;
    rangePrecipLow.axisFill.fill = am4core.color('#00FF00');
    rangePrecipLow.axisFill.fillOpacity = 1;

    // Rango "medio"
    const rangePrecipMid = axisPrecip.axisRanges.create();
    rangePrecipMid.value = 10;
    rangePrecipMid.endValue = 30;
    rangePrecipMid.axisFill.fill = am4core.color('#FFFF00');
    rangePrecipMid.axisFill.fillOpacity = 1;

    // Rango "alto"
    const rangePrecipHigh = axisPrecip.axisRanges.create();
    rangePrecipHigh.value = 30;
    rangePrecipHigh.endValue = axisPrecip.max;
    rangePrecipHigh.axisFill.fill = am4core.color('#FF0000');
    rangePrecipHigh.axisFill.fillOpacity = 1;

    const handPrecip = gaugePrecip.hands.push(new am4charts.ClockHand());
    // Usamos 'accumulatedPrecip' como valor:
    handPrecip.value = accumulatedPrecip;

    gaugePrecipRef.current = gaugePrecip;

    // Limpieza
    return () => {
      if (chartTemp) chartTemp.dispose();
      if (chartHum) chartHum.dispose();
      if (gaugeTemp) gaugeTemp.dispose();
      if (gaugeHum) gaugeHum.dispose();
      if (chartSunRef.current) {
        chartSunRef.current.dispose();
        chartSunRef.current = null;
      }
      if (gaugePrecip) gaugePrecip.dispose();
    };
  }, [
    datosEstacion,
    tempMax,
    tempMin,
    humMax,
    humMin,
    currentTemperature,
    currentHumidity,
    infoEstacion?.timezone,
    latitude,
    longitude,
    accumulatedPrecip
  ]);

  // Calcular clases condicionales para las cards
  const tempCardClass =
    tempMax !== null &&
    tempMin !== null &&
    (currentTemperature > tempMax || currentTemperature < tempMin)
      ? 'light-red-bg'
      : '';

  const humCardClass =
    humMax !== null &&
    humMin !== null &&
    (currentHumidity > humMax || currentHumidity < humMin)
      ? 'light-red-bg'
      : '';

  // Mensajes según la precipitación acumulada
  const isNoRain = accumulatedPrecip === 0;

  // Para mostrar texto debajo del gauge de precipitación
  const rangeText =
    forecastRange === '3h'
      ? 'En las próximas 3 horas'
      : forecastRange === '24h'
      ? 'En las próximas 24 horas'
      : 'En los próximos 5 días';

  return (
    <div className="container mt-4 panel-control-container">
      <PageTitle title="Datos de la Estación" />

      {/* Info general de la estación */}
      {infoEstacion && (
        <div className="info-mapa-container mt-4">
          <div className="info">
            <h3>{infoEstacion.nombre}</h3>
            <p><strong>Número de Serie:</strong> {serialNumber}</p>
            <p><strong>Ubicación:</strong> {infoEstacion.location}</p>
            <p><strong>Zona Horaria:</strong> {infoEstacion.timezone}</p>
            <p>
              <strong>Activa Desde: </strong>
              {formatLocalTimestamp(infoEstacion.activa_desde, infoEstacion.timezone)}
            </p>
            <p><strong>Estado:</strong> {estadoEstacion}</p>
          </div>

          {/* Mapa con Leaflet */}
          <div className="map-container">
            <div id="map-leaflet" style={{ height: '300px', width: '100%' }} />
          </div>
        </div>
      )}

      {/* Gauges de Temperatura y Humedad */}
      <div className="row mt-4">
        <div className="col-md-6">
          <div className={`card text-center ${tempCardClass}`}>
            <div className="card-header bg-info text-white">
              <h4>Temperatura Actual</h4>
            </div>
            <div className="card-body">
              <div id="gaugeTemperatura" style={{ width: '100%', height: '200px' }}></div>
              <p className="display-4">
                {currentTemperature !== null ? `${currentTemperature} °C` : '--'}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className={`card text-center ${humCardClass}`}>
            <div className="card-header bg-info text-white">
              <h4>Humedad Actual</h4>
            </div>
            <div className="card-body">
              <div id="gaugeHumedad" style={{ width: '100%', height: '200px' }}></div>
              <p className="display-4">
                {currentHumidity !== null ? `${currentHumidity} %` : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta: Horas Sol (amCharts 5) */}
      {latitude && longitude && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-header bg-info text-white">
                <h4>Horas Sol</h4>
              </div>
              <div className="card-body">
                <div
                  id="graficoHorasSol"
                  style={{ width: '100%', height: '300px', margin: '0 auto' }}
                ></div>
              </div>
              <div className="row">
                <div className="col">
                  <p>
                    <span style={{ fontSize: '24px' }}>&#9650;</span>{' '}
                    <span id="sunriseTime">{sunriseTime}</span>
                  </p>
                </div>
                <div className="col">
                  <p>
                    <span style={{ fontSize: '24px' }}>&#9660;</span>{' '}
                    <span id="sunsetTime">{sunsetTime}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta: Precipitación acumulada según rango */}
      {forecastData && forecastData.list && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-header bg-info text-white">
                <h4>Precipitación</h4>
              </div>
              <div className="card-body">
                {/* Gauge de precipitación */}
                <div 
                  id="gaugePrecipitacion" 
                  style={{ width: '100%', height: '200px', marginTop: '5px' }}  
                ></div>

                {/* Valor en mm */}
                <p className="display-4">
                  {accumulatedPrecip.toFixed(2)} mm
                </p>
                <p>{rangeText}</p>

                {/* Mensajito según si hay o no lluvia */}
                <div className="row">
                  <div className="col">
                    {isNoRain ? (
                      <p>
                        <span className="text-success">Sin precipitaciones 😊</span>
                      </p>
                    ) : (
                      <p>
                        <span className="text-warning">Se espera lluvia 😅</span>
                      </p>
                    )}
                  </div>
                </div>
                <p>
                  Las precipitaciones de hoy han sido{' '}
                  {isNoRain ? 'nulas en comparación con días anteriores.' : 'similares a las anteriores.'}
                </p>

                {/* Selector de rango */}
                <div className="form-group">
                  <label>Rango de Pronóstico:</label>
                  <select
                    className="form-control"
                    value={forecastRange}
                    onChange={(e) => setForecastRange(e.target.value)}
                  >
                    <option value="3h">Próximas 3 horas</option>
                    <option value="24h">Próximas 24 horas</option>
                    <option value="5d">Próximos 5 días</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario para filtrar por fecha/hora */}
      <div className="accordion mt-4" id="accordionFechaHora">
        <div className="card">
          <div className="card-header" id="headingOne" style={{ cursor: 'pointer' }}>
            <h2 className="mb-0" onClick={() => setIsFechaHoraOpen(!isFechaHoraOpen)}>
              <button
                className="btn btn-link btn-block text-left"
                type="button"
                aria-expanded={isFechaHoraOpen}
                aria-controls="collapseOne"
                style={{ textDecoration: 'none' }}
              >
                Seleccionar Fecha y Hora
                <span className="float-right">{isFechaHoraOpen ? '-' : '+'}</span>
              </button>
            </h2>
          </div>
          <div
            id="collapseOne"
            className={`collapse ${isFechaHoraOpen ? 'show' : ''}`}
            aria-labelledby="headingOne"
            data-parent="#accordionFechaHora"
          >
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    id="fecha"
                    name="fecha"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hora">Hora</label>
                  <input
                    type="time"
                    className="form-control"
                    id="hora"
                    name="hora"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary mt-2">
                  Ver Datos
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla con los datos de la estación */}
      <div className="accordion mt-4" id="accordionDatos">
        <div className="card">
          <div className="card-header" id="headingTwo" style={{ cursor: 'pointer' }}>
            <h2 className="mb-0" onClick={() => setIsDatosOpen(!isDatosOpen)}>
              <button
                className="btn btn-link btn-block text-left"
                type="button"
                aria-expanded={isDatosOpen}
                aria-controls="collapseTwo"
                style={{ textDecoration: 'none' }}
              >
                Mostrar Datos de la Estación
                <span className="float-right">{isDatosOpen ? '-' : '+'}</span>
              </button>
            </h2>
          </div>
          <div
            id="collapseTwo"
            className={`collapse ${isDatosOpen ? 'show' : ''}`}
            aria-labelledby="headingTwo"
            data-parent="#accordionDatos"
          >
            <div className="card-body">
              {datosEstacion.length > 0 ? (
                <table className="table table-bordered data-table mt-4">
                  <thead>
                    <tr>
                      <th>Temperatura (°C)</th>
                      <th>Humedad (%)</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosEstacion.map((dato, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            color:
                              tempMax !== null &&
                              tempMin !== null &&
                              (dato.temperature > tempMax || dato.temperature < tempMin)
                                ? 'red'
                                : 'black'
                          }}
                        >
                          {dato.temperature}
                        </td>
                        <td
                          style={{
                            color:
                              humMax !== null &&
                              humMin !== null &&
                              (dato.humidity > humMax || dato.humidity < humMin)
                                ? 'red'
                                : 'black'
                          }}
                        >
                          {dato.humidity}
                        </td>
                        <td>
                          {formatLocalTimestamp(dato.timestamp, infoEstacion?.timezone)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay datos disponibles para esta estación en el rango seleccionado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Temperatura y Humedad (amCharts 4) */}
      <div className="mt-5">
        <h4 className="text-center">Gráfico de Temperatura</h4>
        <div id="graficoTemperatura" style={{ width: '100%', height: '400px' }} />

        <h4 className="text-center mt-5">Gráfico de Humedad</h4>
        <div id="graficoHumedad" style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Alerta */}
      {alerta && (
        <div className={`alert alert-${alerta.tipo} custom-alert mt-4`} role="alert">
          {alerta.texto}
        </div>
      )}
    </div>
  );
};

export default Station;
