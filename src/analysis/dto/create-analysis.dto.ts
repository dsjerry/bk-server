import { IsNotEmpty } from "class-validator";

export class CreateAnalysisDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    content: string;

    reasoningContent?: string;

    @IsNotEmpty()
    keepingId: number;
}
