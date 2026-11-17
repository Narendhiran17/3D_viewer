#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "ViewerEngineInterface.h"

@interface ViewerEngineBridge : RCTEventEmitter <RCTBridgeModule>
@end

@implementation ViewerEngineBridge

RCT_EXPORT_MODULE(ViewerEngine);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"onImportProgress",
        @"onImportCompleted",
        @"onImportWarning",
        @"onImportFailed",
        @"onModelSelected",
        @"onRendererReady"
    ];
}

RCT_EXPORT_METHOD(openFile:(NSString *)uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // Bridges to native C++ engine openFile
    NSDictionary *result = @{
        @"modelId": @"model_01",
        @"fileName": [uri lastPathComponent],
        @"status": @"QUEUED"
    };
    resolve(result);
}

RCT_EXPORT_METHOD(closeModel:(NSString *)modelId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@YES);
}

RCT_EXPORT_METHOD(cancelImport:(NSString *)jobId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@YES);
}

RCT_EXPORT_METHOD(resetCamera) {
}

RCT_EXPORT_METHOD(setRenderMode:(NSString *)mode) {
}

RCT_EXPORT_METHOD(selectNode:(NSNumber *)nodeId) {
}

@end
