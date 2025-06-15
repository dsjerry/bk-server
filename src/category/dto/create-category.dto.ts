import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCategoryDto {
    @ApiProperty({ description: '名称' })
    @IsString()
    name: string

    @ApiProperty({ description: '图标' })
    @IsString()
    @IsOptional()
    icon: string
}
