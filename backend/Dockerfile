FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/Shree.API/Shree.API.csproj", "src/Shree.API/"]
COPY ["src/Shree.Application/Shree.Application.csproj", "src/Shree.Application/"]
COPY ["src/Shree.Domain/Shree.Domain.csproj", "src/Shree.Domain/"]
COPY ["src/Shree.Infrastructure/Shree.Infrastructure.csproj", "src/Shree.Infrastructure/"]

RUN dotnet restore "src/Shree.API/Shree.API.csproj"

COPY . .
WORKDIR "/src/src/Shree.API"
RUN dotnet build "Shree.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Shree.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Shree.API.dll"]
