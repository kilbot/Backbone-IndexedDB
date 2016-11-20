var browsers = {};
var caps = {};

caps['base'] = 'SauceLabs';
caps['browserName'] = 'Safari';
caps['appiumVersion'] = '1.6.0';
caps['deviceName'] = 'iPhone Simulator';
caps['deviceOrientation'] = 'portrait';
caps['platformVersion'] = '10.0';
caps['platformName'] = 'iOS';

browsers['iOS_10_Safari'] = caps;

module.exports = browsers;