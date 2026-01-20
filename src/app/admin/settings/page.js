'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var framer_motion_1 = require("framer-motion");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
function SettingsPage() {
    var _this = this;
    var _a, _b;
    var router = (0, navigation_1.useRouter)();
    var _c = (0, react_1.useState)(''), password = _c[0], setPassword = _c[1];
    var _d = (0, react_1.useState)(false), isAuthenticated = _d[0], setIsAuthenticated = _d[1];
    var _e = (0, react_1.useState)(''), ghlToken = _e[0], setGhlToken = _e[1];
    var _f = (0, react_1.useState)(''), ghlTokenDisplay = _f[0], setGhlTokenDisplay = _f[1];
    var _g = (0, react_1.useState)(''), ghlLocationId = _g[0], setGhlLocationId = _g[1];
    var _h = (0, react_1.useState)(false), showToken = _h[0], setShowToken = _h[1];
    var _j = (0, react_1.useState)(false), isLoading = _j[0], setIsLoading = _j[1];
    var _k = (0, react_1.useState)(false), isSaving = _k[0], setIsSaving = _k[1];
    var _l = (0, react_1.useState)(false), isTesting = _l[0], setIsTesting = _l[1];
    var _m = (0, react_1.useState)(null), message = _m[0], setMessage = _m[1];
    var _o = (0, react_1.useState)('unknown'), connectionStatus = _o[0], setConnectionStatus = _o[1];
    var _p = (0, react_1.useState)('Raleigh Cleaning Company'), widgetTitle = _p[0], setWidgetTitle = _p[1];
    var _q = (0, react_1.useState)("Let's get your professional cleaning price!"), widgetSubtitle = _q[0], setWidgetSubtitle = _q[1];
    var _r = (0, react_1.useState)('#f61590'), widgetPrimaryColor = _r[0], setWidgetPrimaryColor = _r[1];
    var _s = (0, react_1.useState)(false), isSavingWidget = _s[0], setIsSavingWidget = _s[1];
    var _t = (0, react_1.useState)(null), widgetMessage = _t[0], setWidgetMessage = _t[1];
    var _u = (0, react_1.useState)(false), copiedEmbed = _u[0], setCopiedEmbed = _u[1];
    // Tracking Codes State
    var _v = (0, react_1.useState)(''), googleAnalyticsId = _v[0], setGoogleAnalyticsId = _v[1];
    var _w = (0, react_1.useState)(''), googleTagManagerId = _w[0], setGoogleTagManagerId = _w[1];
    var _x = (0, react_1.useState)(''), metaPixelId = _x[0], setMetaPixelId = _x[1];
    var _y = (0, react_1.useState)(''), customHeadCode = _y[0], setCustomHeadCode = _y[1];
    var _z = (0, react_1.useState)(false), isLoadingTracking = _z[0], setIsLoadingTracking = _z[1];
    var _0 = (0, react_1.useState)(false), isSavingTracking = _0[0], setIsSavingTracking = _0[1];
    var _1 = (0, react_1.useState)(null), trackingMessage = _1[0], setTrackingMessage = _1[1];
    // Form Settings State
    var _2 = (0, react_1.useState)(''), firstNameParam = _2[0], setFirstNameParam = _2[1];
    var _3 = (0, react_1.useState)(''), lastNameParam = _3[0], setLastNameParam = _3[1];
    var _4 = (0, react_1.useState)(''), emailParam = _4[0], setEmailParam = _4[1];
    var _5 = (0, react_1.useState)(''), phoneParam = _5[0], setPhoneParam = _5[1];
    var _6 = (0, react_1.useState)(''), addressParam = _6[0], setAddressParam = _6[1];
    var _7 = (0, react_1.useState)(false), isLoadingFormSettings = _7[0], setIsLoadingFormSettings = _7[1];
    var _8 = (0, react_1.useState)(false), isSavingFormSettings = _8[0], setIsSavingFormSettings = _8[1];
    var _9 = (0, react_1.useState)(null), formSettingsMessage = _9[0], setFormSettingsMessage = _9[1];
    // GHL Configuration States
    var _10 = (0, react_1.useState)(false), ghlConfigLoaded = _10[0], setGhlConfigLoaded = _10[1];
    var _11 = (0, react_1.useState)(true), createContact = _11[0], setCreateContact = _11[1];
    var _12 = (0, react_1.useState)(false), createOpportunity = _12[0], setCreateOpportunity = _12[1];
    var _13 = (0, react_1.useState)(true), createNote = _13[0], setCreateNote = _13[1];
    var _14 = (0, react_1.useState)([]), pipelines = _14[0], setPipelines = _14[1];
    var _15 = (0, react_1.useState)(''), selectedPipelineId = _15[0], setSelectedPipelineId = _15[1];
    var _16 = (0, react_1.useState)(''), selectedStageId = _16[0], setSelectedStageId = _16[1];
    var _17 = (0, react_1.useState)('open'), opportunityStatus = _17[0], setOpportunityStatus = _17[1];
    var _18 = (0, react_1.useState)(0), opportunityValue = _18[0], setOpportunityValue = _18[1];
    var _19 = (0, react_1.useState)(true), useDynamicPricingForValue = _19[0], setUseDynamicPricingForValue = _19[1];
    var _20 = (0, react_1.useState)(false), isLoadingPipelines = _20[0], setIsLoadingPipelines = _20[1];
    var _21 = (0, react_1.useState)(null), pipelinesError = _21[0], setPipelinesError = _21[1];
    var _22 = (0, react_1.useState)(false), isSavingConfig = _22[0], setIsSavingConfig = _22[1];
    var _23 = (0, react_1.useState)(null), configMessage = _23[0], setConfigMessage = _23[1];
    // Service Area and Tags State
    var _24 = (0, react_1.useState)(''), inServiceTags = _24[0], setInServiceTags = _24[1];
    var _25 = (0, react_1.useState)(''), outOfServiceTags = _25[0], setOutOfServiceTags = _25[1];
    var _26 = (0, react_1.useState)(null), serviceAreaFile = _26[0], setServiceAreaFile = _26[1];
    var _27 = (0, react_1.useState)(null), serviceAreaMessage = _27[0], setServiceAreaMessage = _27[1];
    var _28 = (0, react_1.useState)(false), isUploadingServiceArea = _28[0], setIsUploadingServiceArea = _28[1];
    var _29 = (0, react_1.useState)('none'), serviceAreaType = _29[0], setServiceAreaType = _29[1];
    var _30 = (0, react_1.useState)(null), networkLinkUrl = _30[0], setNetworkLinkUrl = _30[1];
    var _31 = (0, react_1.useState)(0), polygonCoordinateCount = _31[0], setPolygonCoordinateCount = _31[1];
    var _32 = (0, react_1.useState)([]), calendars = _32[0], setCalendars = _32[1];
    var _33 = (0, react_1.useState)(''), selectedCalendarId = _33[0], setSelectedCalendarId = _33[1];
    var _34 = (0, react_1.useState)(false), isLoadingCalendars = _34[0], setIsLoadingCalendars = _34[1];
    var _35 = (0, react_1.useState)([]), ghlTags = _35[0], setGhlTags = _35[1];
    var _36 = (0, react_1.useState)(new Set()), selectedInServiceTags = _36[0], setSelectedInServiceTags = _36[1];
    var _37 = (0, react_1.useState)(new Set()), selectedOutOfServiceTags = _37[0], setSelectedOutOfServiceTags = _37[1];
    var _38 = (0, react_1.useState)(false), isLoadingTags = _38[0], setIsLoadingTags = _38[1];
    // Google Maps API Key State
    var _39 = (0, react_1.useState)(''), googleMapsApiKey = _39[0], setGoogleMapsApiKey = _39[1];
    var _40 = (0, react_1.useState)(''), googleMapsApiKeyDisplay = _40[0], setGoogleMapsApiKeyDisplay = _40[1];
    var _41 = (0, react_1.useState)(false), isLoadingApiKey = _41[0], setIsLoadingApiKey = _41[1];
    var _42 = (0, react_1.useState)(false), isSavingApiKey = _42[0], setIsSavingApiKey = _42[1];
    var _43 = (0, react_1.useState)(null), apiKeyMessage = _43[0], setApiKeyMessage = _43[1];
    // Collapsible Cards State
    var _44 = (0, react_1.useState)(new Set()), expandedCards = _44[0], setExpandedCards = _44[1];
    var toggleCard = function (cardId) {
        var newExpanded = new Set(expandedCards);
        if (newExpanded.has(cardId)) {
            newExpanded.delete(cardId);
        }
        else {
            newExpanded.add(cardId);
        }
        setExpandedCards(newExpanded);
    };
    var isCardExpanded = function (cardId) { return expandedCards.has(cardId); };
    // Check authentication
    (0, react_1.useEffect)(function () {
        var storedPassword = sessionStorage.getItem('admin_password');
        if (storedPassword) {
            setPassword(storedPassword);
            checkAuth(storedPassword);
        }
    }, []);
    // Load current settings
    (0, react_1.useEffect)(function () {
        if (isAuthenticated) {
            loadSettings();
            loadWidgetSettings();
            loadGHLConfig();
        }
    }, [isAuthenticated]);
    // Load pipelines when connection status changes to connected
    (0, react_1.useEffect)(function () {
        if (isAuthenticated && connectionStatus === 'connected' && createOpportunity) {
            loadPipelines();
        }
    }, [connectionStatus, createOpportunity, isAuthenticated]);
    var checkAuth = function (pass) { return __awaiter(_this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-settings', {
                            headers: {
                                'x-admin-password': pass,
                            },
                        })];
                case 1:
                    response = _a.sent();
                    if (response.ok) {
                        setIsAuthenticated(true);
                        sessionStorage.setItem('admin_password', pass);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Auth check failed:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var handleLogin = function () {
        if (password.trim()) {
            checkAuth(password);
        }
    };
    var loadSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-settings', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setGhlTokenDisplay(data.maskedToken || '••••••••••••••••');
                    setGhlLocationId(data.locationId || '');
                    setConnectionStatus(data.connected ? 'connected' : 'disconnected');
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_2 = _a.sent();
                    console.error('Failed to load settings:', error_2);
                    return [3 /*break*/, 7];
                case 6:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveToken = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, errorText, detailsText, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!ghlToken.trim()) {
                        setMessage({ type: 'error', text: 'Please enter a GHL API token' });
                        return [2 /*return*/];
                    }
                    if (!ghlLocationId.trim()) {
                        setMessage({ type: 'error', text: 'Please enter a Location ID' });
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-settings', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({ token: ghlToken, locationId: ghlLocationId }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setMessage({ type: 'success', text: 'GHL API token saved successfully!' });
                        setGhlToken('');
                        setGhlTokenDisplay("****".concat(ghlToken.slice(-4)));
                        setConnectionStatus('connected');
                        setTimeout(function () { return loadSettings(); }, 500);
                    }
                    else {
                        errorText = data.error || 'Failed to save GHL API token';
                        detailsText = data.details ? " Details: ".concat(data.details) : '';
                        setMessage({
                            type: 'error',
                            text: errorText + detailsText,
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    setMessage({
                        type: 'error',
                        text: 'Failed to save GHL API token. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSaving(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleTestConnection = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, errorText, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsTesting(true);
                    setConnectionStatus('testing');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-settings', {
                            method: 'PUT',
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (data.connected) {
                        setMessage({ type: 'success', text: 'Connected to GHL successfully!' });
                        setConnectionStatus('connected');
                    }
                    else {
                        errorText = data.error || data.message || 'Failed to connect to GHL';
                        setMessage({
                            type: 'error',
                            text: errorText + (data.details ? " (".concat(data.details, ")") : ''),
                        });
                        setConnectionStatus('disconnected');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_4 = _a.sent();
                    setMessage({
                        type: 'error',
                        text: 'Failed to test connection. Please try again.',
                    });
                    setConnectionStatus('disconnected');
                    return [3 /*break*/, 6];
                case 5:
                    setIsTesting(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var loadWidgetSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/admin/widget-settings', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setWidgetTitle(data.title || 'Raleigh Cleaning Company');
                    setWidgetSubtitle(data.subtitle || "Let's get your professional cleaning price!");
                    setWidgetPrimaryColor(data.primaryColor || '#f61590');
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_5 = _a.sent();
                    console.error('Failed to load widget settings:', error_5);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveWidgetSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsSavingWidget(true);
                    setWidgetMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/widget-settings', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({
                                title: widgetTitle,
                                subtitle: widgetSubtitle,
                                primaryColor: widgetPrimaryColor,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setWidgetMessage({ type: 'success', text: 'Widget settings saved successfully!' });
                    }
                    else {
                        setWidgetMessage({
                            type: 'error',
                            text: data.error || 'Failed to save widget settings',
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_6 = _a.sent();
                    setWidgetMessage({
                        type: 'error',
                        text: 'Failed to save widget settings. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSavingWidget(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var getEmbedCode = function () {
        var baseUrl = window.location.origin;
        return "<!-- Raleigh Cleaning Company Quote Widget -->\n<div id=\"cleaning-quote-widget\"></div>\n<script src=\"".concat(baseUrl, "/widget.js\" data-base-url=\"").concat(baseUrl, "\" data-container-id=\"cleaning-quote-widget\"></script>");
    };
    var handleCopyEmbed = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, navigator.clipboard.writeText(getEmbedCode())];
                case 1:
                    _a.sent();
                    setCopiedEmbed(true);
                    setTimeout(function () { return setCopiedEmbed(false); }, 2000);
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    console.error('Failed to copy embed code:', error_7);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // Load GHL configuration and pipelines
    var loadGHLConfig = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, config, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-config', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    config = data.config;
                    setCreateContact(config.createContact !== false);
                    setCreateOpportunity(config.createOpportunity === true);
                    setCreateNote(config.createNote !== false);
                    setSelectedPipelineId(config.pipelineId || '');
                    setSelectedStageId(config.pipelineStageId || '');
                    setOpportunityStatus(config.opportunityStatus || 'open');
                    setOpportunityValue(config.opportunityMonetaryValue || 0);
                    setUseDynamicPricingForValue(config.useDynamicPricingForValue !== false);
                    setGhlConfigLoaded(true);
                    if (!(connectionStatus === 'connected')) return [3 /*break*/, 4];
                    return [4 /*yield*/, loadPipelines()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_8 = _a.sent();
                    console.error('Failed to load GHL config:', error_8);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Load pipelines from GHL
    var loadPipelines = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, data, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoadingPipelines(true);
                    setPipelinesError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-pipelines', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setPipelines(data.pipelines || []);
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    data = _a.sent();
                    setPipelinesError(data.error || 'Failed to load pipelines');
                    _a.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    error_9 = _a.sent();
                    console.error('Failed to load pipelines:', error_9);
                    setPipelinesError('Failed to load pipelines. Please check your GHL connection.');
                    return [3 /*break*/, 9];
                case 8:
                    setIsLoadingPipelines(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    // Save GHL configuration
    var handleSaveGHLConfig = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (createOpportunity && (!selectedPipelineId || !selectedStageId)) {
                        setConfigMessage({ type: 'error', text: 'Please select a pipeline and stage for opportunities' });
                        return [2 /*return*/];
                    }
                    setIsSavingConfig(true);
                    setConfigMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-config', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({
                                createContact: createContact,
                                createOpportunity: createOpportunity,
                                createNote: createNote,
                                pipelineId: selectedPipelineId || undefined,
                                pipelineStageId: selectedStageId || undefined,
                                opportunityStatus: opportunityStatus,
                                opportunityMonetaryValue: opportunityValue || undefined,
                                useDynamicPricingForValue: useDynamicPricingForValue,
                                inServiceTags: Array.from(selectedInServiceTags).length > 0 ? Array.from(selectedInServiceTags) : undefined,
                                outOfServiceTags: Array.from(selectedOutOfServiceTags).length > 0 ? Array.from(selectedOutOfServiceTags) : undefined,
                                calendarId: selectedCalendarId || undefined,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setConfigMessage({ type: 'success', text: 'GHL configuration saved successfully!' });
                    }
                    else {
                        setConfigMessage({
                            type: 'error',
                            text: data.error || 'Failed to save GHL configuration',
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_10 = _a.sent();
                    setConfigMessage({
                        type: 'error',
                        text: 'Failed to save GHL configuration. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSavingConfig(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleUploadServiceArea = function () { return __awaiter(_this, void 0, void 0, function () {
        var content, response, data, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!serviceAreaFile) {
                        setServiceAreaMessage({ type: 'error', text: 'Please select a KML file' });
                        return [2 /*return*/];
                    }
                    setIsUploadingServiceArea(true);
                    setServiceAreaMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, serviceAreaFile.text()];
                case 2:
                    content = _a.sent();
                    return [4 /*yield*/, fetch('/api/admin/service-area/upload', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({ kmlContent: content }),
                        })];
                case 3:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    if (response.ok) {
                        setServiceAreaMessage({ type: 'success', text: data.message });
                        setServiceAreaFile(null);
                        setServiceAreaType(data.type);
                        if (data.type === 'network') {
                            setNetworkLinkUrl(data.networkLink || null);
                        }
                        setPolygonCoordinateCount(data.polygonCount || 0);
                    }
                    else {
                        setServiceAreaMessage({
                            type: 'error',
                            text: data.error || 'Failed to upload service area',
                        });
                    }
                    return [3 /*break*/, 7];
                case 5:
                    error_11 = _a.sent();
                    setServiceAreaMessage({
                        type: 'error',
                        text: error_11 instanceof Error ? error_11.message : 'Failed to upload service area',
                    });
                    return [3 /*break*/, 7];
                case 6:
                    setIsUploadingServiceArea(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var loadCalendars = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error, error_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isAuthenticated)
                        return [2 /*return*/];
                    setIsLoadingCalendars(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-calendars', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setCalendars(data.calendars || []);
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    error = _a.sent();
                    console.error('Error loading calendars:', error);
                    // Show user-friendly error message
                    if (error.error) {
                        console.log('Calendar error details:', error.error);
                    }
                    _a.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    error_12 = _a.sent();
                    console.error('Error loading calendars:', error_12);
                    return [3 /*break*/, 9];
                case 8:
                    setIsLoadingCalendars(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var loadTags = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error, error_13;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isAuthenticated)
                        return [2 /*return*/];
                    setIsLoadingTags(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 9]);
                    return [4 /*yield*/, fetch('/api/admin/ghl-tags', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setGhlTags(data.tags || []);
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    error = _a.sent();
                    console.error('Error loading tags:', error);
                    // Show user-friendly error message
                    if (error.error) {
                        console.log('Tag error details:', error.error);
                    }
                    _a.label = 6;
                case 6: return [3 /*break*/, 9];
                case 7:
                    error_13 = _a.sent();
                    console.error('Error loading tags:', error_13);
                    return [3 /*break*/, 9];
                case 8:
                    setIsLoadingTags(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var loadServiceAreaConfig = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/admin/service-area/status', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    setServiceAreaType(data.type || 'none');
                    if (data.type === 'network') {
                        setNetworkLinkUrl(data.networkLink || null);
                    }
                    setPolygonCoordinateCount(data.polygonCount || 0);
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    error_14 = _a.sent();
                    console.error('Error loading service area config:', error_14);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var loadGoogleMapsKey = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoadingApiKey(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, fetch('/api/admin/google-maps-key', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setGoogleMapsApiKeyDisplay(data.maskedKey || '••••••••••••••••');
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_15 = _a.sent();
                    console.error('Error loading Google Maps API key:', error_15);
                    return [3 /*break*/, 7];
                case 6:
                    setIsLoadingApiKey(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveGoogleMapsKey = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!googleMapsApiKey.trim()) {
                        setApiKeyMessage({ type: 'error', text: 'Please enter a Google Maps API key' });
                        return [2 /*return*/];
                    }
                    setIsSavingApiKey(true);
                    setApiKeyMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/google-maps-key', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({
                                apiKey: googleMapsApiKey,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setApiKeyMessage({ type: 'success', text: 'Google Maps API key saved successfully!' });
                        setGoogleMapsApiKey('');
                        setGoogleMapsApiKeyDisplay("****".concat(googleMapsApiKey.slice(-4)));
                        setTimeout(function () { return loadGoogleMapsKey(); }, 500);
                    }
                    else {
                        setApiKeyMessage({
                            type: 'error',
                            text: data.error || 'Failed to save Google Maps API key',
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_16 = _a.sent();
                    setApiKeyMessage({
                        type: 'error',
                        text: 'Failed to save Google Maps API key. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSavingApiKey(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var loadTrackingCodes = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_17;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoadingTracking(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, fetch('/api/admin/tracking-codes', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setGoogleAnalyticsId(data.trackingCodes.googleAnalyticsId || '');
                    setGoogleTagManagerId(data.trackingCodes.googleTagManagerId || '');
                    setMetaPixelId(data.trackingCodes.metaPixelId || '');
                    setCustomHeadCode(data.trackingCodes.customHeadCode || '');
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_17 = _a.sent();
                    console.error('Error loading tracking codes:', error_17);
                    return [3 /*break*/, 7];
                case 6:
                    setIsLoadingTracking(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var loadFormSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_18;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoadingFormSettings(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, fetch('/api/admin/form-settings', {
                            headers: {
                                'x-admin-password': password,
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setFirstNameParam(data.formSettings.firstNameParam || '');
                    setLastNameParam(data.formSettings.lastNameParam || '');
                    setEmailParam(data.formSettings.emailParam || '');
                    setPhoneParam(data.formSettings.phoneParam || '');
                    setAddressParam(data.formSettings.addressParam || '');
                    _a.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    error_18 = _a.sent();
                    console.error('Error loading form settings:', error_18);
                    return [3 /*break*/, 7];
                case 6:
                    setIsLoadingFormSettings(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveTrackingCodes = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_19;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsSavingTracking(true);
                    setTrackingMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/tracking-codes', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({
                                googleAnalyticsId: googleAnalyticsId,
                                googleTagManagerId: googleTagManagerId,
                                metaPixelId: metaPixelId,
                                customHeadCode: customHeadCode,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setTrackingMessage({ type: 'success', text: 'Tracking codes saved successfully!' });
                    }
                    else {
                        setTrackingMessage({
                            type: 'error',
                            text: data.error || 'Failed to save tracking codes',
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_19 = _a.sent();
                    setTrackingMessage({
                        type: 'error',
                        text: 'Failed to save tracking codes. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSavingTracking(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveFormSettings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_20;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsSavingFormSettings(true);
                    setFormSettingsMessage(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/admin/form-settings', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-password': password,
                            },
                            body: JSON.stringify({
                                firstNameParam: firstNameParam,
                                lastNameParam: lastNameParam,
                                emailParam: emailParam,
                                phoneParam: phoneParam,
                                addressParam: addressParam,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        setFormSettingsMessage({ type: 'success', text: 'Form settings saved successfully!' });
                    }
                    else {
                        setFormSettingsMessage({
                            type: 'error',
                            text: data.error || 'Failed to save form settings',
                        });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_20 = _a.sent();
                    setFormSettingsMessage({
                        type: 'error',
                        text: 'Failed to save form settings. Please try again.',
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSavingFormSettings(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Load calendars and tags when component mounts and authenticated
    (0, react_1.useEffect)(function () {
        if (isAuthenticated) {
            if (calendars.length === 0) {
                loadCalendars();
            }
            if (ghlTags.length === 0) {
                loadTags();
            }
            if (serviceAreaType === 'none') {
                loadServiceAreaConfig();
            }
            if (!googleMapsApiKeyDisplay) {
                loadGoogleMapsKey();
            }
            if (!googleAnalyticsId) {
                loadTrackingCodes();
            }
            if (!firstNameParam) {
                loadFormSettings();
            }
        }
    }, [isAuthenticated]);
    if (!isAuthenticated) {
        return (React.createElement("main", { className: "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8" },
            React.createElement("div", { className: "max-w-md mx-auto mt-20" },
                React.createElement(card_1.Card, { className: "shadow-2xl border-2" },
                    React.createElement(card_1.CardHeader, null,
                        React.createElement(card_1.CardTitle, { className: "text-2xl text-center" }, "Admin Access"),
                        React.createElement(card_1.CardDescription, { className: "text-center" }, "Enter your admin password to access settings")),
                    React.createElement(card_1.CardContent, null,
                        React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "password" }, "Admin Password"),
                                React.createElement(input_1.Input, { id: "password", type: "password", value: password, onChange: function (e) { return setPassword(e.target.value); }, placeholder: "Enter your password", className: "mt-3", onKeyDown: function (e) {
                                        if (e.key === 'Enter') {
                                            handleLogin();
                                        }
                                    } })),
                            React.createElement(button_1.Button, { onClick: handleLogin, className: "w-full", size: "lg" }, "Login")))))));
    }
    return (React.createElement("main", { className: "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8" },
        React.createElement("div", { className: "max-w-4xl mx-auto" },
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, className: "mb-12" },
                React.createElement(button_1.Button, { onClick: function () { return router.push('/admin'); }, variant: "outline", className: "mb-6 flex items-center gap-2" },
                    React.createElement(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }),
                    "Back to Admin"),
                React.createElement("div", { className: "flex items-center gap-3 mb-3" },
                    React.createElement(lucide_react_1.Sparkles, { className: "h-8 w-8 text-[#f61590]" }),
                    React.createElement("h1", { className: "text-4xl font-bold text-gray-900" }, "Settings")),
                React.createElement("p", { className: "text-gray-600 text-lg" }, "Configure your quote form and integrations")),
            message && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "mb-8 p-4 rounded-lg flex items-center gap-3 ".concat(message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200') },
                message.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                React.createElement("p", null, message.text))),
            React.createElement("div", { className: "space-y-8" },
                React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 } },
                    React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                        React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('ghl-token'); } },
                            React.createElement("div", { className: "flex items-center justify-between" },
                                React.createElement("div", null,
                                    React.createElement(card_1.CardTitle, { className: "text-2xl font-bold" }, "GoHighLevel API Token"),
                                    React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Configure your GHL PIT token to enable CRM integration")),
                                React.createElement("div", { className: "flex items-center gap-3" },
                                    React.createElement("div", { className: "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ".concat(connectionStatus === 'connected'
                                            ? 'bg-green-100 text-green-800'
                                            : connectionStatus === 'testing'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800') },
                                        connectionStatus === 'connected' && (React.createElement(React.Fragment, null,
                                            React.createElement("div", { className: "w-2 h-2 rounded-full bg-green-600" }),
                                            "Connected")),
                                        connectionStatus === 'testing' && (React.createElement(React.Fragment, null,
                                            React.createElement(lucide_react_1.Loader2, { className: "h-3 w-3 animate-spin" }),
                                            "Testing")),
                                        (connectionStatus === 'disconnected' || connectionStatus === 'unknown') && (React.createElement(React.Fragment, null,
                                            React.createElement("div", { className: "w-2 h-2 rounded-full bg-gray-400" }),
                                            connectionStatus === 'unknown' ? 'Unknown' : 'Disconnected'))),
                                    React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform ".concat(isCardExpanded('ghl-token') ? 'rotate-180' : '') })))),
                        isCardExpanded('ghl-token') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                            React.createElement("div", { className: "space-y-6" },
                                React.createElement("div", null,
                                    React.createElement(label_1.Label, { htmlFor: "token", className: "text-base font-semibold" }, "GHL Private Integration Token (PIT)"),
                                    React.createElement("p", { className: "text-sm text-gray-600 mt-1 mb-3" },
                                        "Enter your GoHighLevel API token. ",
                                        React.createElement("strong", { className: "text-[#f61590]" }, "We strongly recommend using a Location-level PIT token"),
                                        " (sub-account level) for better security and reliability. Keep this secret - never share it publicly."),
                                    React.createElement("div", { className: "mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg" },
                                        React.createElement("p", { className: "text-sm font-semibold text-blue-900 mb-1" }, "\uD83D\uDCA1 Recommended: Location-level PIT Token"),
                                        React.createElement("p", { className: "text-xs text-blue-800" }, "Location-level (sub-account) PIT tokens are scoped to a specific location and provide better security. All API calls will use the Location ID you provide below to ensure proper sub-account integration.")),
                                    React.createElement("div", { className: "relative" },
                                        React.createElement(input_1.Input, { id: "token", type: showToken ? 'text' : 'password', value: ghlToken, onChange: function (e) { return setGhlToken(e.target.value); }, placeholder: "ghl_pit_... (leave blank to keep current token)", className: "pr-10" }),
                                        React.createElement("button", { type: "button", onClick: function () { return setShowToken(!showToken); }, className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700" }, showToken ? (React.createElement(lucide_react_1.EyeOff, { className: "h-4 w-4" })) : (React.createElement(lucide_react_1.Eye, { className: "h-4 w-4" })))),
                                    React.createElement("div", { className: "mt-4" },
                                        React.createElement(label_1.Label, { htmlFor: "locationId", className: "text-base font-semibold" },
                                            "Location ID ",
                                            React.createElement("span", { className: "text-red-500" }, "*")),
                                        React.createElement("p", { className: "text-sm text-gray-600 mt-1 mb-3" }, "Enter your GoHighLevel Location ID. This is required for GHL API integration. You can find this in your GHL dashboard URL after /location/"),
                                        React.createElement(input_1.Input, { id: "locationId", type: "text", value: ghlLocationId, onChange: function (e) { return setGhlLocationId(e.target.value); }, placeholder: "e.g., ve9EPM428h8vShlRW1KT", className: "font-mono", required: true })),
                                    React.createElement("div", { className: "mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg" },
                                        React.createElement("p", { className: "text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2" },
                                            React.createElement(lucide_react_1.AlertCircle, { className: "h-4 w-4" }),
                                            "Required GHL Scopes:"),
                                        React.createElement("ul", { className: "text-xs text-amber-800 space-y-1 ml-6 list-disc" },
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "contacts.write"),
                                                " - Create/update contacts and add notes ",
                                                React.createElement("span", { className: "font-bold text-amber-900" }, "(REQUIRED)")),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "contacts.readonly"),
                                                " - View customer contact information"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "opportunities.readonly"),
                                                " - Read pipelines for configuration"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "opportunities.write"),
                                                " - Create opportunities from quotes"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "calendars.write"),
                                                " - Create appointments for bookings"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "calendars.readonly"),
                                                " - View available calendars"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "locations.readonly"),
                                                " - Fetch calendars, tags, and location information"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "locations/customFields.readonly"),
                                                " - View custom fields for field mapping"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "locations/tags.readonly"),
                                                " - View available tags for service area"),
                                            React.createElement("li", null,
                                                React.createElement("strong", null, "locations/tags.write"),
                                                " - Apply tags to customers (in-service/out-of-service)")),
                                        React.createElement("p", { className: "text-xs text-amber-700 mt-2 italic" },
                                            React.createElement("strong", null, "Important:"),
                                            " We recommend using a ",
                                            React.createElement("strong", null, "Location-level PIT token"),
                                            " (sub-account level) for all integrations. Location-level tokens don't need the locations.readonly scope and provide better security by scoping to a specific location. All API calls will automatically use your Location ID for sub-account operations."))),
                                React.createElement("div", { className: "mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg" },
                                    React.createElement("div", { className: "flex items-start justify-between gap-4" },
                                        React.createElement("div", { className: "flex-1" },
                                            React.createElement("h4", { className: "font-semibold text-gray-900 mb-2 flex items-center gap-2" },
                                                React.createElement(lucide_react_1.FileText, { className: "h-5 w-5 text-blue-600" }),
                                                "Field Mapping"),
                                            React.createElement("p", { className: "text-sm text-gray-700 mb-3" }, "Map your survey questions to GHL fields (native fields like firstName, lastName, email, phone, or custom fields). Edit each question in the Survey Builder and select which GHL field it should map to."),
                                            React.createElement(button_1.Button, { onClick: function () { return router.push('/admin/survey-builder'); }, variant: "default", className: "flex items-center gap-2" },
                                                React.createElement(lucide_react_1.FileText, { className: "h-4 w-4" }),
                                                "Go to Survey Builder")))),
                                ghlTokenDisplay && ghlTokenDisplay !== '••••••••••••••••' && (React.createElement("div", { className: "p-3 bg-blue-50 border border-blue-200 rounded-lg" },
                                    React.createElement("p", { className: "text-sm text-blue-800" },
                                        "Current token: ",
                                        React.createElement("span", { className: "font-mono font-semibold" }, ghlTokenDisplay)))),
                                React.createElement("div", { className: "flex gap-3 pt-4" },
                                    React.createElement(button_1.Button, { onClick: handleSaveToken, disabled: isSaving || !ghlToken.trim() || !ghlLocationId.trim(), className: "flex items-center gap-2" }, isSaving ? (React.createElement(React.Fragment, null,
                                        React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                        "Saving...")) : (React.createElement(React.Fragment, null,
                                        React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                        "Save Token"))),
                                    React.createElement(button_1.Button, { onClick: handleTestConnection, disabled: isTesting, variant: "outline", className: "flex items-center gap-2" }, isTesting ? (React.createElement(React.Fragment, null,
                                        React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                        "Testing...")) : (React.createElement(React.Fragment, null,
                                        React.createElement(lucide_react_1.RotateCw, { className: "h-4 w-4" }),
                                        "Test Connection"))))))))),
                React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 } },
                    React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                        React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('about-ghl'); } },
                            React.createElement("div", { className: "flex items-center justify-between" },
                                React.createElement(card_1.CardTitle, { className: "text-2xl font-bold" }, "About GHL Integration"),
                                React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform ".concat(isCardExpanded('about-ghl') ? 'rotate-180' : '') }))),
                        isCardExpanded('about-ghl') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                            React.createElement("div", { className: "space-y-6 text-sm text-gray-700" },
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "font-semibold text-gray-900 mb-2" }, "What does this do?"),
                                    React.createElement("p", null, "When enabled, the quote form will automatically create contacts and opportunities in your GoHighLevel CRM whenever a customer generates a quote. This includes:"),
                                    React.createElement("ul", { className: "list-disc list-inside mt-2 space-y-1 ml-2" },
                                        React.createElement("li", null, "Creating a new contact with customer information"),
                                        React.createElement("li", null, "Creating an opportunity with the quote value"),
                                        React.createElement("li", null, "Adding a detailed note with all quote information"))),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "font-semibold text-gray-900 mb-2" }, "How to get your GHL PIT token"),
                                    React.createElement("p", null,
                                        "1. Log in to your GoHighLevel dashboard",
                                        React.createElement("br", null),
                                        "2. Navigate to the specific Location (sub-account) you want to integrate",
                                        React.createElement("br", null),
                                        "3. Go to Settings \u2192 Integrations \u2192 API",
                                        React.createElement("br", null),
                                        "4. ",
                                        React.createElement("strong", null, "Create a Location-level Private Integration Token"),
                                        " (recommended) or use an existing one",
                                        React.createElement("br", null),
                                        "5. Copy the token and paste it above",
                                        React.createElement("br", null),
                                        "6. Enter the Location ID from your dashboard URL (found after /location/)")),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "font-semibold text-gray-900 mb-2" }, "Required API Scopes"),
                                    React.createElement("p", { className: "mb-2" }, "When creating your Private Integration Token, make sure to enable these scopes:"),
                                    React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2" },
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "contacts.write"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to create and update customer contacts"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "contacts.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to view customer contact information"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "opportunities.write"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to create quote opportunities in your pipeline"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "opportunities.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to fetch pipeline and stage information"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "calendars.write"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to book and create appointments for customers"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "calendars.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to view available calendars"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "locations.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to fetch calendars, tags, custom fields, and location information"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "locations/customFields.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to view custom fields for mapping survey questions"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "locations/tags.readonly"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to view available tags for service area tagging"))),
                                        React.createElement("div", { className: "flex items-start gap-2" },
                                            React.createElement("span", { className: "text-blue-600 font-bold mt-0.5" }, "\u2713"),
                                            React.createElement("div", null,
                                                React.createElement("p", { className: "font-semibold text-blue-900" }, "locations/tags.write"),
                                                React.createElement("p", { className: "text-xs text-blue-800" }, "Required to apply tags to customers (in-service/out-of-service)"))))),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "font-semibold text-gray-900 mb-2" }, "Field Mapping"),
                                    React.createElement("p", null,
                                        "To map your survey questions to GHL fields (native fields like firstName, lastName, email, phone, or custom fields), go to the ",
                                        React.createElement("strong", null, "Survey Builder"),
                                        " page. There you can edit each question and select which GHL field it should map to."),
                                    React.createElement(button_1.Button, { onClick: function () { return router.push('/admin/survey-builder'); }, variant: "outline", className: "mt-3 flex items-center gap-2" },
                                        React.createElement(lucide_react_1.FileText, { className: "h-4 w-4" }),
                                        "Go to Survey Builder")),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "font-semibold text-gray-900 mb-2" }, "Security"),
                                    React.createElement("p", null, "Your GHL token is stored securely in encrypted storage and is never exposed to the client."))))))),
                React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 } },
                    React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                        React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('ghl-config'); } },
                            React.createElement("div", { className: "flex items-center justify-between" },
                                React.createElement("div", null,
                                    React.createElement(card_1.CardTitle, { className: "flex items-center gap-2 text-2xl font-bold text-gray-900" },
                                        React.createElement(lucide_react_1.Sparkles, { className: "h-6 w-6 text-[#f61590]" }),
                                        "GHL Integration Configuration"),
                                    React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Configure what happens when a customer gets a quote. Choose which GHL features to enable and set default values for opportunities.")),
                                React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('ghl-config') ? 'rotate-180' : '') }))),
                        isCardExpanded('ghl-config') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" }, connectionStatus !== 'connected' ? (React.createElement("div", { className: "bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800" },
                            React.createElement("p", { className: "font-semibold" }, "\u26A0\uFE0F GHL not connected"),
                            React.createElement("p", { className: "text-sm mt-1" }, "Please verify your GHL API token above before configuring integration features."))) : (React.createElement("div", { className: "space-y-6" },
                            configMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(configMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                configMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, configMessage.text))),
                            React.createElement("div", { className: "space-y-6" },
                                React.createElement("h3", { className: "font-semibold text-gray-900" }, "Select Features"),
                                React.createElement("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" },
                                    React.createElement("input", { type: "checkbox", id: "create-contact", checked: createContact, onChange: function (e) { return setCreateContact(e.target.checked); }, className: "w-5 h-5 text-[#f61590] rounded cursor-pointer" }),
                                    React.createElement("label", { htmlFor: "create-contact", className: "cursor-pointer flex-1" },
                                        React.createElement("div", { className: "font-semibold text-gray-900" }, "Create/Update Contact"),
                                        React.createElement("div", { className: "text-sm text-gray-600" }, "Automatically create or update contact with customer info (name, email, phone)"))),
                                React.createElement("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" },
                                    React.createElement("input", { type: "checkbox", id: "create-opportunity", checked: createOpportunity, onChange: function (e) { return setCreateOpportunity(e.target.checked); }, className: "w-5 h-5 text-[#f61590] rounded cursor-pointer" }),
                                    React.createElement("label", { htmlFor: "create-opportunity", className: "cursor-pointer flex-1" },
                                        React.createElement("div", { className: "font-semibold text-gray-900" }, "Create Opportunity"),
                                        React.createElement("div", { className: "text-sm text-gray-600" }, "Automatically create a sales opportunity with the quote details"))),
                                React.createElement("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" },
                                    React.createElement("input", { type: "checkbox", id: "create-note", checked: createNote, onChange: function (e) { return setCreateNote(e.target.checked); }, className: "w-5 h-5 text-[#f61590] rounded cursor-pointer" }),
                                    React.createElement("label", { htmlFor: "create-note", className: "cursor-pointer flex-1" },
                                        React.createElement("div", { className: "font-semibold text-gray-900" }, "Create Note"),
                                        React.createElement("div", { className: "text-sm text-gray-600" }, "Add a note to the contact with the complete quote summary")))),
                            createOpportunity && (React.createElement("div", { className: "p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4" },
                                React.createElement("h3", { className: "font-semibold text-gray-900 flex items-center gap-2" },
                                    React.createElement(lucide_react_1.ChevronDown, { className: "h-4 w-4" }),
                                    "Opportunity Settings"),
                                pipelinesError ? (React.createElement("div", { className: "text-sm text-red-600 bg-red-50 p-3 rounded" }, pipelinesError)) : null,
                                isLoadingPipelines ? (React.createElement("div", { className: "flex items-center gap-2 text-gray-600" },
                                    React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                    "Loading pipelines...")) : pipelines.length === 0 ? (React.createElement("div", { className: "text-sm text-gray-600" }, "No pipelines found. Please create a pipeline in GHL first.")) : (React.createElement(React.Fragment, null,
                                    React.createElement("div", null,
                                        React.createElement(label_1.Label, { className: "text-base font-semibold mb-2 block" }, "Select Pipeline"),
                                        React.createElement("select", { value: selectedPipelineId, onChange: function (e) {
                                                setSelectedPipelineId(e.target.value);
                                                setSelectedStageId(''); // Reset stage when pipeline changes
                                            }, className: "w-full px-3 py-2 border border-gray-300 rounded-md bg-white" },
                                            React.createElement("option", { value: "" }, "-- Select a pipeline --"),
                                            pipelines.map(function (p) { return (React.createElement("option", { key: p.id, value: p.id }, p.name)); }))),
                                    selectedPipelineId && (React.createElement("div", null,
                                        React.createElement(label_1.Label, { className: "text-base font-semibold mb-2 block" }, "Select Starting Stage"),
                                        React.createElement("select", { value: selectedStageId, onChange: function (e) { return setSelectedStageId(e.target.value); }, className: "w-full px-3 py-2 border border-gray-300 rounded-md bg-white" },
                                            React.createElement("option", { value: "" }, "-- Select a stage --"), (_b = (_a = pipelines
                                            .find(function (p) { return p.id === selectedPipelineId; })) === null || _a === void 0 ? void 0 : _a.stages) === null || _b === void 0 ? void 0 :
                                            _b.map(function (s) { return (React.createElement("option", { key: s.id, value: s.id }, s.name)); })))),
                                    React.createElement("div", null,
                                        React.createElement(label_1.Label, { className: "text-base font-semibold mb-2 block" }, "Opportunity Status"),
                                        React.createElement("select", { value: opportunityStatus, onChange: function (e) { return setOpportunityStatus(e.target.value); }, className: "w-full px-3 py-2 border border-gray-300 rounded-md bg-white" },
                                            React.createElement("option", { value: "open" }, "Open"),
                                            React.createElement("option", { value: "won" }, "Won"),
                                            React.createElement("option", { value: "lost" }, "Lost"),
                                            React.createElement("option", { value: "abandoned" }, "Abandoned"))),
                                    React.createElement("div", { className: "space-y-3" },
                                        React.createElement(label_1.Label, { className: "text-base font-semibold" }, "Opportunity Monetary Value"),
                                        React.createElement("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" },
                                            React.createElement("input", { type: "radio", id: "use-dynamic-pricing", checked: useDynamicPricingForValue, onChange: function () { return setUseDynamicPricingForValue(true); }, className: "w-4 h-4 text-[#f61590] cursor-pointer" }),
                                            React.createElement("label", { htmlFor: "use-dynamic-pricing", className: "cursor-pointer flex-1" },
                                                React.createElement("div", { className: "font-semibold text-gray-900" }, "Use Dynamic Quote Price"),
                                                React.createElement("div", { className: "text-sm text-gray-600" }, "Use the quote price calculated from the customer's selections"))),
                                        React.createElement("div", { className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200" },
                                            React.createElement("input", { type: "radio", id: "use-fixed-value", checked: !useDynamicPricingForValue, onChange: function () { return setUseDynamicPricingForValue(false); }, className: "w-4 h-4 text-[#f61590] cursor-pointer" }),
                                            React.createElement("label", { htmlFor: "use-fixed-value", className: "cursor-pointer flex-1" },
                                                React.createElement("div", { className: "font-semibold text-gray-900" }, "Use Fixed Value"),
                                                React.createElement("div", { className: "text-sm text-gray-600" }, "Set a fixed monetary value for all opportunities"))),
                                        !useDynamicPricingForValue && (React.createElement(input_1.Input, { type: "number", value: opportunityValue || '', onChange: function (e) { return setOpportunityValue(Number(e.target.value) || 0); }, placeholder: "e.g., 150", className: "h-10" }))))))),
                            React.createElement(button_1.Button, { onClick: handleSaveGHLConfig, disabled: isSavingConfig, className: "w-full h-11 font-semibold flex items-center gap-2" }, isSavingConfig ? (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                "Saving...")) : (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                "Save GHL Configuration")))))))),
                    ")}")),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('service-area'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "flex items-center gap-2 text-2xl font-bold" },
                                    React.createElement(lucide_react_1.MapPin, { className: "h-5 w-5 text-emerald-600" }),
                                    "Service Area Configuration"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Upload a KML file with your service area polygon, and configure tags for in-service and out-of-service customers")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('service-area') ? 'rotate-180' : '') }))),
                    isCardExpanded('service-area') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            serviceAreaMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(serviceAreaMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                serviceAreaMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, serviceAreaMessage.text))),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { className: "text-base font-semibold" }, "Upload Service Area Polygon (KML)"),
                                serviceAreaType !== 'none' && (React.createElement("div", { className: "mt-3 p-4 rounded-lg border-2 ".concat(serviceAreaType === 'network'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-emerald-50 border-emerald-200') },
                                    React.createElement("div", { className: "flex items-start justify-between gap-3" },
                                        React.createElement("div", { className: "flex-1" },
                                            React.createElement("p", { className: "font-semibold ".concat(serviceAreaType === 'network'
                                                    ? 'text-blue-900'
                                                    : 'text-emerald-900') }, serviceAreaType === 'network' ? '🔗 NetworkLink Active' : '✓ Direct Polygon Active'),
                                            React.createElement("p", { className: "text-sm mt-1 ".concat(serviceAreaType === 'network'
                                                    ? 'text-blue-800'
                                                    : 'text-emerald-800') }, serviceAreaType === 'network'
                                                ? "Automatically fetching from: ".concat(networkLinkUrl)
                                                : "".concat(polygonCoordinateCount, " coordinates loaded")))))),
                                React.createElement("div", { className: "mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center" },
                                    React.createElement("input", { type: "file", accept: ".kml,.kmz", onChange: function (e) { var _a; return setServiceAreaFile(((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) || null); }, className: "hidden", id: "kml-file-input" }),
                                    React.createElement("label", { htmlFor: "kml-file-input", className: "cursor-pointer" },
                                        React.createElement(lucide_react_1.Upload, { className: "h-8 w-8 mx-auto mb-2 text-gray-400" }),
                                        React.createElement("p", { className: "font-semibold text-gray-700" }, "Click to select KML file"),
                                        React.createElement("p", { className: "text-sm text-gray-600" }, "or drag and drop"),
                                        serviceAreaFile && (React.createElement("p", { className: "text-sm text-emerald-600 mt-2" },
                                            "\uD83D\uDCC1 ",
                                            serviceAreaFile.name)))),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "Export your service area as a KML file from Google Maps or other mapping software. The system supports:"),
                                React.createElement("ul", { className: "text-sm text-gray-600 list-disc list-inside space-y-1 ml-2 mt-1" },
                                    React.createElement("li", null,
                                        React.createElement("strong", null, "Direct KML files"),
                                        " - Traditional KML with polygon coordinates. Uploads once and stores the data."),
                                    React.createElement("li", null,
                                        React.createElement("strong", null, "NetworkLink references"),
                                        " - KML files that link to a remote server. The system will automatically fetch and update the polygon data periodically, so you don't need to re-upload when your map changes!")),
                                serviceAreaFile && (React.createElement(button_1.Button, { onClick: handleUploadServiceArea, disabled: isUploadingServiceArea, className: "w-full mt-4 h-10 font-semibold flex items-center gap-2" }, isUploadingServiceArea ? (React.createElement(React.Fragment, null,
                                    React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                    "Uploading...")) : (React.createElement(React.Fragment, null,
                                    React.createElement(lucide_react_1.Upload, { className: "h-4 w-4" }),
                                    "Upload Polygon"))))),
                            React.createElement("div", null,
                                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                                    React.createElement(label_1.Label, { className: "text-base font-semibold" }, "Tags for In-Service Customers"),
                                    React.createElement(button_1.Button, { type: "button", variant: "ghost", size: "sm", onClick: loadTags, disabled: isLoadingTags, className: "text-xs h-6" },
                                        React.createElement(lucide_react_1.RotateCw, { className: "h-3 w-3 ".concat(isLoadingTags ? 'animate-spin' : '') }))),
                                React.createElement("div", { className: "mt-2 p-3 border-2 border-gray-200 rounded-lg max-h-40 overflow-y-auto space-y-2" }, ghlTags.length > 0 ? (ghlTags.map(function (tag) { return (React.createElement("label", { key: tag.id, className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded" },
                                    React.createElement("input", { type: "checkbox", checked: selectedInServiceTags.has(tag.name), onChange: function (e) {
                                            var newTags = new Set(selectedInServiceTags);
                                            if (e.target.checked) {
                                                newTags.add(tag.name);
                                            }
                                            else {
                                                newTags.delete(tag.name);
                                            }
                                            setSelectedInServiceTags(newTags);
                                        }, className: "w-4 h-4 rounded text-[#f61590]" }),
                                    React.createElement("span", { className: "text-sm text-gray-700" }, tag.name))); })) : (React.createElement("p", { className: "text-sm text-gray-500 italic" }, "No tags available. Click refresh to load from GHL."))),
                                React.createElement("div", { className: "mt-3 flex gap-2 flex-wrap" }, Array.from(selectedInServiceTags).map(function (tag) { return (React.createElement("span", { key: tag, className: "inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm" },
                                    tag,
                                    React.createElement("button", { type: "button", onClick: function () {
                                            var newTags = new Set(selectedInServiceTags);
                                            newTags.delete(tag);
                                            setSelectedInServiceTags(newTags);
                                        }, className: "hover:text-emerald-900" }, "\u00D7"))); })),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "Select tags from your GHL location or add custom tags. These tags will automatically be applied to customers within your service area.")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { className: "text-base font-semibold" }, "Tags for Out-of-Service Customers"),
                                React.createElement("div", { className: "mt-2 p-3 border-2 border-gray-200 rounded-lg max-h-40 overflow-y-auto space-y-2" }, ghlTags.length > 0 ? (ghlTags.map(function (tag) { return (React.createElement("label", { key: tag.id, className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded" },
                                    React.createElement("input", { type: "checkbox", checked: selectedOutOfServiceTags.has(tag.name), onChange: function (e) {
                                            var newTags = new Set(selectedOutOfServiceTags);
                                            if (e.target.checked) {
                                                newTags.add(tag.name);
                                            }
                                            else {
                                                newTags.delete(tag.name);
                                            }
                                            setSelectedOutOfServiceTags(newTags);
                                        }, className: "w-4 h-4 rounded text-[#f61590]" }),
                                    React.createElement("span", { className: "text-sm text-gray-700" }, tag.name))); })) : (React.createElement("p", { className: "text-sm text-gray-500 italic" }, "No tags available. Click refresh to load from GHL."))),
                                React.createElement("div", { className: "mt-3 flex gap-2 flex-wrap" }, Array.from(selectedOutOfServiceTags).map(function (tag) { return (React.createElement("span", { key: tag, className: "inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm" },
                                    tag,
                                    React.createElement("button", { type: "button", onClick: function () {
                                            var newTags = new Set(selectedOutOfServiceTags);
                                            newTags.delete(tag);
                                            setSelectedOutOfServiceTags(newTags);
                                        }, className: "hover:text-red-900" }, "\u00D7"))); })),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "Select tags from your GHL location or add custom tags. These tags will automatically be applied to customers outside your service area.")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "calendar-select", className: "text-base font-semibold" }, "Default Calendar for Appointments"),
                                React.createElement("div", { className: "mt-2 flex gap-2" },
                                    React.createElement("select", { id: "calendar-select", value: selectedCalendarId, onChange: function (e) { return setSelectedCalendarId(e.target.value); }, className: "flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900" },
                                        React.createElement("option", { value: "" }, "-- Select a calendar --"),
                                        calendars.map(function (cal) { return (React.createElement("option", { key: cal.id, value: cal.id }, cal.name)); })),
                                    React.createElement(button_1.Button, { type: "button", variant: "outline", size: "sm", onClick: loadCalendars, disabled: isLoadingCalendars },
                                        React.createElement(lucide_react_1.RotateCw, { className: "h-4 w-4 ".concat(isLoadingCalendars ? 'animate-spin' : '') }))),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "Select which GHL calendar appointments should be booked to. Leave empty to use default calendar."))))))),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.34 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('google-maps'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "flex items-center gap-2 text-2xl font-bold" },
                                    React.createElement(lucide_react_1.Code, { className: "h-5 w-5 text-blue-600" }),
                                    "Google Maps API Key"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Configure your Google Maps API key for address autocomplete and service area mapping")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('google-maps') ? 'rotate-180' : '') }))),
                    isCardExpanded('google-maps') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            apiKeyMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(apiKeyMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                apiKeyMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, apiKeyMessage.text))),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "google-maps-key", className: "text-base font-semibold" }, "API Key"),
                                React.createElement(input_1.Input, { id: "google-maps-key", type: "password", value: googleMapsApiKey, onChange: function (e) { return setGoogleMapsApiKey(e.target.value); }, placeholder: "Leave blank to keep current key", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" },
                                    "Current key: ",
                                    googleMapsApiKeyDisplay),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "Enter your Google Maps API key to enable Google Places Autocomplete for address input and service area mapping features.")),
                            React.createElement("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg" },
                                React.createElement("h4", { className: "font-semibold text-blue-900 mb-2" }, "How to get a Google Maps API Key:"),
                                React.createElement("ol", { className: "text-sm text-blue-800 space-y-1 list-decimal list-inside" },
                                    React.createElement("li", null,
                                        "Go to ",
                                        React.createElement("a", { href: "https://console.cloud.google.com", target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 underline" }, "Google Cloud Console")),
                                    React.createElement("li", null, "Create a new project or select an existing one"),
                                    React.createElement("li", null, "Enable the \"Places API\" and \"Maps JavaScript API\""),
                                    React.createElement("li", null, "Go to \"Credentials\" and create an API key"),
                                    React.createElement("li", null, "Copy the API key and paste it above"))),
                            React.createElement(button_1.Button, { onClick: handleSaveGoogleMapsKey, disabled: isSavingApiKey, className: "w-full h-11 font-semibold flex items-center gap-2" }, isSavingApiKey ? (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                "Saving...")) : (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                "Save Google Maps API Key")))))))),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.35 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('tracking'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "flex items-center gap-2 text-2xl font-bold" },
                                    React.createElement(lucide_react_1.Code, { className: "h-5 w-5 text-purple-600" }),
                                    "Tracking & Analytics"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Add Google Analytics, Google Tag Manager, Meta Pixel, and custom tracking codes")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('tracking') ? 'rotate-180' : '') }))),
                    isCardExpanded('tracking') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            trackingMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(trackingMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                trackingMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, trackingMessage.text))),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "ga-id", className: "text-base font-semibold" }, "Google Analytics ID"),
                                React.createElement(input_1.Input, { id: "ga-id", value: googleAnalyticsId, onChange: function (e) { return setGoogleAnalyticsId(e.target.value); }, placeholder: "G-XXXXXXXXXX", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Your Google Analytics 4 measurement ID (starts with G-)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "gtm-id", className: "text-base font-semibold" }, "Google Tag Manager ID"),
                                React.createElement(input_1.Input, { id: "gtm-id", value: googleTagManagerId, onChange: function (e) { return setGoogleTagManagerId(e.target.value); }, placeholder: "GTM-XXXXXXX", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Your Google Tag Manager container ID (starts with GTM-)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "meta-pixel-id", className: "text-base font-semibold" }, "Meta Pixel ID"),
                                React.createElement(input_1.Input, { id: "meta-pixel-id", value: metaPixelId, onChange: function (e) { return setMetaPixelId(e.target.value); }, placeholder: "123456789012345", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Your Meta Pixel ID for Facebook/Instagram conversion tracking")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "custom-code", className: "text-base font-semibold" }, "Custom Head Code"),
                                React.createElement("textarea", { id: "custom-code", value: customHeadCode, onChange: function (e) { return setCustomHeadCode(e.target.value); }, placeholder: "<script>...</script>", className: "mt-2 w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "Any additional tracking or custom scripts to add to the page head")),
                            React.createElement(button_1.Button, { onClick: handleSaveTrackingCodes, disabled: isSavingTracking, className: "w-full h-11 font-semibold flex items-center gap-2" }, isSavingTracking ? (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                "Saving...")) : (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                "Save Tracking Codes")))))))),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('form-settings'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "text-2xl font-bold" }, "Query Parameter Settings"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Configure which URL query parameters should pre-fill the form fields. Example: ?firstName=John&email=test@example.com")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('form-settings') ? 'rotate-180' : '') }))),
                    isCardExpanded('form-settings') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            formSettingsMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(formSettingsMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                formSettingsMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, formSettingsMessage.text))),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "first-name-param", className: "text-base font-semibold" }, "First Name Parameter"),
                                React.createElement(input_1.Input, { id: "first-name-param", value: firstNameParam, onChange: function (e) { return setFirstNameParam(e.target.value); }, placeholder: "e.g., firstName, first_name", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "The query parameter name to use for first name (e.g., ?firstName=John)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "last-name-param", className: "text-base font-semibold" }, "Last Name Parameter"),
                                React.createElement(input_1.Input, { id: "last-name-param", value: lastNameParam, onChange: function (e) { return setLastNameParam(e.target.value); }, placeholder: "e.g., lastName, last_name", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "The query parameter name to use for last name (e.g., ?lastName=Doe)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "email-param", className: "text-base font-semibold" }, "Email Parameter"),
                                React.createElement(input_1.Input, { id: "email-param", value: emailParam, onChange: function (e) { return setEmailParam(e.target.value); }, placeholder: "e.g., email, email_address", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "The query parameter name to use for email (e.g., ?email=test@example.com)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "phone-param", className: "text-base font-semibold" }, "Phone Parameter"),
                                React.createElement(input_1.Input, { id: "phone-param", value: phoneParam, onChange: function (e) { return setPhoneParam(e.target.value); }, placeholder: "e.g., phone, phone_number", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "The query parameter name to use for phone (e.g., ?phone=555-1234)")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "address-param", className: "text-base font-semibold" }, "Address Parameter"),
                                React.createElement(input_1.Input, { id: "address-param", value: addressParam, onChange: function (e) { return setAddressParam(e.target.value); }, placeholder: "e.g., address, location", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "The query parameter name to use for address (e.g., ?address=123+Main+St)")),
                            React.createElement(button_1.Button, { onClick: handleSaveFormSettings, disabled: isSavingFormSettings, className: "w-full h-11 font-semibold flex items-center gap-2" }, isSavingFormSettings ? (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                "Saving...")) : (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                "Save Form Settings")))))))),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('customization'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "text-2xl font-bold" }, "Site Customization"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Customize the title, subtitle, and primary color for your entire site")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('customization') ? 'rotate-180' : '') }))),
                    isCardExpanded('customization') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            widgetMessage && (React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "p-4 rounded-lg flex items-center gap-3 ".concat(widgetMessage.type === 'success'
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200') },
                                widgetMessage.type === 'success' ? (React.createElement(lucide_react_1.CheckCircle, { className: "h-5 w-5 flex-shrink-0" })) : (React.createElement(lucide_react_1.AlertCircle, { className: "h-5 w-5 flex-shrink-0" })),
                                React.createElement("p", null, widgetMessage.text))),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "widget-title", className: "text-base font-semibold" }, "Site Title"),
                                React.createElement(input_1.Input, { id: "widget-title", value: widgetTitle, onChange: function (e) { return setWidgetTitle(e.target.value); }, placeholder: "e.g., Raleigh Cleaning Company", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "This title is displayed prominently at the top of the site and used as the page title.")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "widget-subtitle", className: "text-base font-semibold" }, "Site Subtitle"),
                                React.createElement(input_1.Input, { id: "widget-subtitle", value: widgetSubtitle, onChange: function (e) { return setWidgetSubtitle(e.target.value); }, placeholder: "e.g., Let's get your professional cleaning price!", className: "mt-3" }),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, "This subtitle appears below the title throughout the site.")),
                            React.createElement("div", null,
                                React.createElement(label_1.Label, { htmlFor: "widget-primary-color", className: "text-base font-semibold" }, "Primary Brand Color"),
                                React.createElement("div", { className: "mt-2 flex gap-3 items-center" },
                                    React.createElement("input", { id: "widget-primary-color", type: "color", value: widgetPrimaryColor, onChange: function (e) { return setWidgetPrimaryColor(e.target.value); }, className: "w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer" }),
                                    React.createElement("div", { className: "flex-1" },
                                        React.createElement(input_1.Input, { type: "text", value: widgetPrimaryColor, onChange: function (e) {
                                                var val = e.target.value;
                                                if (/^#[0-9A-F]{6}$/i.test(val) || val.length <= 7) {
                                                    setWidgetPrimaryColor(val);
                                                }
                                            }, placeholder: "#f61590", className: "font-mono" }))),
                                React.createElement("p", { className: "text-sm text-gray-600 mt-2" }, "This color is used for buttons, headers, accents, and branding elements throughout the entire site.")),
                            React.createElement(button_1.Button, { onClick: handleSaveWidgetSettings, disabled: isSavingWidget, className: "w-full h-11 font-semibold flex items-center gap-2" }, isSavingWidget ? (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" }),
                                "Saving...")) : (React.createElement(React.Fragment, null,
                                React.createElement(lucide_react_1.Save, { className: "h-4 w-4" }),
                                "Save Widget Settings")))))))),
            React.createElement(framer_motion_1.motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 } },
                React.createElement(card_1.Card, { className: "shadow-lg hover:shadow-xl transition-shadow border border-gray-200" },
                    React.createElement(card_1.CardHeader, { className: "bg-gradient-to-r from-[#f61590]/10 via-transparent to-transparent border-b border-gray-200 pb-6 cursor-pointer", onClick: function () { return toggleCard('embed'); } },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("div", null,
                                React.createElement(card_1.CardTitle, { className: "flex items-center gap-2 text-2xl font-bold" },
                                    React.createElement(lucide_react_1.Code, { className: "h-5 w-5 text-[#f61590]" }),
                                    "Embed Quote Widget"),
                                React.createElement(card_1.CardDescription, { className: "text-gray-600 mt-1" }, "Copy this code and paste it anywhere on your website to embed the quote calculator")),
                            React.createElement(lucide_react_1.ChevronDown, { className: "h-5 w-5 transition-transform flex-shrink-0 ".concat(isCardExpanded('embed') ? 'rotate-180' : '') }))),
                    isCardExpanded('embed') && (React.createElement(card_1.CardContent, { className: "pt-8 pb-8" },
                        React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", { className: "p-4 bg-gray-900 rounded-lg border border-gray-700" },
                                React.createElement("code", { className: "text-green-400 font-mono text-sm whitespace-pre-wrap break-words" }, getEmbedCode())),
                            React.createElement("div", { className: "flex gap-3" },
                                React.createElement(button_1.Button, { onClick: handleCopyEmbed, variant: copiedEmbed ? 'secondary' : 'default', className: "flex-1 h-11 font-semibold flex items-center gap-2" },
                                    React.createElement(lucide_react_1.Copy, { className: "h-4 w-4" }),
                                    copiedEmbed ? 'Copied!' : 'Copy Embed Code')),
                            React.createElement("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg" },
                                React.createElement("h4", { className: "font-semibold text-blue-900 mb-2" }, "How to use:"),
                                React.createElement("ol", { className: "text-sm text-blue-800 space-y-1 list-decimal list-inside" },
                                    React.createElement("li", null, "Copy the embed code above"),
                                    React.createElement("li", null, "Paste it into your website's HTML where you want the widget to appear"),
                                    React.createElement("li", null, "The widget will automatically load and be responsive"),
                                    React.createElement("li", null, "Customize the title and subtitle using the settings above"))),
                            React.createElement("div", { className: "p-4 bg-amber-50 border border-amber-200 rounded-lg" },
                                React.createElement("h4", { className: "font-semibold text-amber-900 mb-2" }, "\u26A0\uFE0F Important:"),
                                React.createElement("p", { className: "text-sm text-amber-800" }, "Make sure your website is accessible from the same domain as this admin panel, or update the data-base-url attribute in the embed code to point to your actual website URL."))))))))));
    main >
    ;
    ;
}
