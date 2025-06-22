import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, IsBoolean, IsNotEmpty } from "class-validator";

export class FileInfoDto {
    @ApiProperty({ description: "文件路径" })
    @IsString()
    @IsNotEmpty()
    filename: string;

    @ApiProperty({ description: "是否获取文件类型" })
    @IsBoolean()
    @Transform(({ value }) => JSON.parse(value))
    @IsOptional()
    mime?: boolean;
}