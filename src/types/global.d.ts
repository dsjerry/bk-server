import { MimeType } from "file-type";

declare global {
    namespace BKS {
        type DownloadFileTokenInfo = {
            userId: number;
            filepath: string;
            mime?: MimeType;
        }

        /** 请求头中提取的用户信息，在jwt.strategy.ts中配置 */
        interface ReqUser {
            userId: number
            username: string
            [key: string]: any
        }
    }
}