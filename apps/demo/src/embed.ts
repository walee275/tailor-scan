import { setDefaultVisionProvider, startIframeEmbed } from "@tailor-scan/widget";
import { createLocalPoseProvider } from "./pose-provider";

setDefaultVisionProvider(createLocalPoseProvider);
startIframeEmbed();
