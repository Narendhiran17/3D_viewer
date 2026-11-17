package com.universal3dviewer.bridge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ViewerEngineModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ViewerEngine"

    init {
        System.loadLibrary("u3d_engine")
    }

    private external fun nativeOpenFile(uri: String): String
    private external fun nativeCloseModel(modelId: String)
    private external fun nativeCancelImport(jobId: String)
    private external fun nativeResetCamera()
    private external fun nativeSetRenderMode(mode: String)
    private external fun nativeSelectNode(nodeId: Int)

    @ReactMethod
    fun openFile(uri: String, promise: Promise) {
        try {
            val result = nativeOpenFile(uri)
            val map = WritableNativeMap().apply {
                putString("jobId", result)
                putString("status", "QUEUED")
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("OPEN_FAILED", e.message)
        }
    }

    @ReactMethod
    fun closeModel(modelId: String, promise: Promise) {
        nativeCloseModel(modelId)
        promise.resolve(true)
    }

    @ReactMethod
    fun cancelImport(jobId: String, promise: Promise) {
        nativeCancelImport(jobId)
        promise.resolve(true)
    }

    @ReactMethod
    fun resetCamera() {
        nativeResetCamera()
    }

    @ReactMethod
    fun setRenderMode(mode: String) {
        nativeSetRenderMode(mode)
    }

    @ReactMethod
    fun selectNode(nodeId: Int) {
        nativeSelectNode(nodeId)
    }
}
