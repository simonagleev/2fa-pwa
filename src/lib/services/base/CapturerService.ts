import AlertService from "./AlertService";
import { CC_CAPTURE_INTERVAL } from "../../../config/config";
import ListService from "./ListService";
import QrScanner from 'qr-scanner';
import RouterService from "./RouterService";
import TYPES from "../../types";
import VideoService from "./VideoService";
import { autorun } from 'mobx';
import { inject } from "react-declarative";

export class CapturerService {

    videoService = inject<VideoService>(TYPES.videoService);
    routerService = inject<RouterService>(TYPES.routerService);
    listService = inject<ListService>(TYPES.listService);
    alertService = inject<AlertService>(TYPES.alertService);

    interval: NodeJS.Timeout | null = null;
    
    constructor() {
        autorun(() => {
            const state = this.videoService.state;
            const pathname = this.routerService.location?.pathname;
            if (state === 'resolved' && pathname === '/scanner') {
                const handler = async () => {
                    await this.processBlob()
                    this.interval = setTimeout(handler, CC_CAPTURE_INTERVAL);
                };
                handler();
            }
        }); 
        autorun(() => {
            const state = this.videoService.state;
            const pathname = this.routerService.location?.pathname;
            if (state !== 'resolved' || pathname !== '/scanner') {
                this.interval && clearInterval(this.interval);
            }
        }); 
    };

    processBlob = async () => {
        console.log('capture')
        const { mediaStream } = this.videoService;
        
        if(mediaStream) {
            const track = mediaStream.getVideoTracks()[0];
            const capturer = new ImageCapture(track);
            const frame: ImageBitmap = await capturer.grabFrame();
            try { 
                const result = await QrScanner.scanImage(frame);
                const url = new URL(result);
                const secret = url.searchParams.get("secret")!;
                const issuer = url.searchParams.get("issuer")!;
                if (secret) {
                    this.interval && clearTimeout(this.interval);
                    this.listService.addAuthItem(secret, issuer ? issuer : prompt('Type token issuer') || 'Unknown issuer', result);
                    this.routerService.push('/home');
                    this.alertService.notify(`${issuer} added!`);
                }
            } catch (e) {
                console.log('no image found', e)
            }        
            
        }
       
    };
    
};

export default CapturerService;
