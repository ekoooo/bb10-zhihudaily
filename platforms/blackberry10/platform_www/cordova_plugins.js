cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.blackberry.ui.dialog/www/client.js",
        "id": "com.blackberry.ui.dialog.client",
        "pluginId": "com.blackberry.ui.dialog",
        "clobbers": [
            "blackberry.ui.dialog"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-inappbrowser": "1.6.1",
    "com.blackberry.ui.dialog": "1.0.0"
}
// BOTTOM OF METADATA
});